import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import ViewShot from 'react-native-view-shot';
import { useTheme } from '../../context/ThemeContext';
import EditorCanvas, { EditorCanvasHandle } from './EditorCanvas';
import Checkerboard from './Checkerboard';
import FiltersPanel from './panels/FiltersPanel';
import AdjustPanel from './panels/AdjustPanel';
import StickerPanel from './panels/StickerPanel';
import ShapePanel from './panels/ShapePanel';
import BackgroundPanel from './panels/BackgroundPanel';
import LayersPanel from './panels/LayersPanel';
import TextEditorModal from './panels/TextEditorModal';
import { useEditorFonts } from './fonts';
import { buildFinalMatrix, FILTER_PRESETS, IDENTITY_MATRIX } from './filters';
import { fetchApi, uploadImage } from '../../utils/api';
import {
  Adjustments,
  DEFAULT_ADJUSTMENTS,
  ImageLayerData,
  Layer,
  LayerTransform,
  makeLayer,
  makeTransform,
  ShapeKind,
  ShapeLayerData,
  TextLayerData,
  newLayerId,
} from './types';

type Tool = 'none' | 'crop' | 'filters' | 'adjust' | 'background' | 'shapes' | 'stickers' | 'layers';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function MediaEditorScreen({ navigation, route }: any) {
  const { theme } = useTheme();
  const [fontsLoaded] = useEditorFonts();
  const {
    initialImageUri = null,
    initialGradient = null,
    initialLayers = [],
    aspectRatio,
    mode = 'photo',
    templateCategory,
    returnScreen,
    returnParamKey = 'editedImageUri',
  } = route.params ?? {};

  const ratio = aspectRatio ?? (mode === 'poster' ? 4 / 5 : 1);
  const canvasWidth = SCREEN_WIDTH - 32;
  const canvasHeight = canvasWidth / ratio;

  const [imageUri, setImageUri] = useState<string | null>(initialImageUri);
  const [gradient, setGradient] = useState<readonly [string, string] | null>(initialGradient);
  const [layers, setLayers] = useState<Layer[]>(() =>
    (initialLayers as Layer[]).map((l) => ({ ...l, id: l.id || newLayerId() })),
  );
  const layersRef = useRef<Layer[]>(layers);
  useEffect(() => {
    layersRef.current = layers;
  }, [layers]);

  const [history, setHistory] = useState<Layer[][]>([]);
  const [future, setFuture] = useState<Layer[][]>([]);

  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<Tool>('none');
  const [filterKey, setFilterKey] = useState('original');
  const [adjustments, setAdjustments] = useState<Adjustments>(DEFAULT_ADJUSTMENTS);
  const [textModalVisible, setTextModalVisible] = useState(false);
  const [editingTextLayerId, setEditingTextLayerId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const canvasRef = useRef<EditorCanvasHandle>(null);
  const shotRef = useRef<React.ComponentRef<typeof ViewShot>>(null);

  const filterMatrix = useMemo(() => {
    const preset = FILTER_PRESETS.find((f) => f.key === filterKey)?.matrix ?? IDENTITY_MATRIX;
    return buildFinalMatrix(preset, adjustments.brightness, adjustments.contrast, adjustments.saturation);
  }, [filterKey, adjustments]);

  const selectedLayer = layers.find((l) => l.id === selectedLayerId) ?? null;
  const transparentBackground = !imageUri && !gradient;

  const mutateLayers = useCallback((updater: (prev: Layer[]) => Layer[]) => {
    setHistory((h) => [...h, layersRef.current]);
    setFuture([]);
    setLayers((prev) => updater(prev));
  }, []);

  const undo = () => {
    setHistory((h) => {
      if (h.length === 0) return h;
      const prevState = h[h.length - 1];
      setFuture((f) => [...f, layersRef.current]);
      setLayers(prevState);
      return h.slice(0, -1);
    });
    setSelectedLayerId(null);
  };
  const redo = () => {
    setFuture((f) => {
      if (f.length === 0) return f;
      const nextState = f[f.length - 1];
      setHistory((h) => [...h, layersRef.current]);
      setLayers(nextState);
      return f.slice(0, -1);
    });
    setSelectedLayerId(null);
  };

  const handleChangeLayerTransform = (id: string, t: LayerTransform) => {
    mutateLayers((prev) => prev.map((l) => (l.id === id ? { ...l, transform: t } : l)));
  };

  const addTextLayer = () => {
    setEditingTextLayerId(null);
    setTextModalVisible(true);
  };

  const saveTextLayer = (data: TextLayerData) => {
    if (editingTextLayerId) {
      mutateLayers((prev) => prev.map((l) => (l.id === editingTextLayerId ? { ...l, data } : l)));
    } else {
      const id = newLayerId();
      mutateLayers((prev) => [...prev, makeLayer(id, data, makeTransform(canvasWidth / 2, canvasHeight / 2))]);
      setSelectedLayerId(id);
    }
    setTextModalVisible(false);
    setEditingTextLayerId(null);
  };

  const addStickerLayer = (emoji: string) => {
    const id = newLayerId();
    mutateLayers((prev) => [...prev, makeLayer(id, { kind: 'sticker', emoji }, makeTransform(canvasWidth / 2, canvasHeight / 2))]);
    setSelectedLayerId(id);
    setActiveTool('none');
  };

  const addShapeLayer = (shapeType: ShapeKind, color: string) => {
    const dims = shapeType === 'line' ? { width: 180, height: 4 } : shapeType === 'circle' ? { width: 120, height: 120 } : { width: 160, height: 100 };
    const data: ShapeLayerData = { kind: 'shape', shapeType, color, width: dims.width, height: dims.height, cornerRadius: shapeType === 'rect' ? 16 : undefined };
    const id = newLayerId();
    mutateLayers((prev) => [...prev, makeLayer(id, data, makeTransform(canvasWidth / 2, canvasHeight / 2))]);
    setSelectedLayerId(id);
    setActiveTool('none');
  };

  const addImageLayer = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1, allowsEditing: false });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const w = asset.width ?? 800;
    const h = asset.height ?? 800;
    const maxDim = Math.min(canvasWidth, canvasHeight) * 0.7;
    const factor = maxDim / Math.max(w, h);
    const data: ImageLayerData = { kind: 'image', uri: asset.uri, width: w * factor, height: h * factor, processedUri: null, removingBackground: false };
    const id = newLayerId();
    mutateLayers((prev) => [...prev, makeLayer(id, data, makeTransform(canvasWidth / 2, canvasHeight / 2))]);
    setSelectedLayerId(id);
    setActiveTool('none');
  };

  const removeBackgroundForImage = async (id: string) => {
    const layer = layersRef.current.find((l) => l.id === id);
    if (!layer || layer.data.kind !== 'image') return;
    setLayers((prev) => prev.map((l) => (l.id === id && l.data.kind === 'image' ? { ...l, data: { ...l.data, removingBackground: true } } : l)));
    try {
      const original = (layer.data as ImageLayerData).uri;
      const hostedUrl = /^https?:\/\//.test(original) ? original : await uploadImage(original);
      const res = await fetchApi('/editor/remove-background', { method: 'POST', body: JSON.stringify({ imageUrl: hostedUrl }) });
      if (!res.ok) throw new Error('Background removal failed');
      const json = await res.json();
      mutateLayers((prev) =>
        prev.map((l) => (l.id === id && l.data.kind === 'image' ? { ...l, data: { ...l.data, uri: hostedUrl, processedUri: json.url, removingBackground: false } } : l)),
      );
    } catch (e) {
      setLayers((prev) => prev.map((l) => (l.id === id && l.data.kind === 'image' ? { ...l, data: { ...l.data, removingBackground: false } } : l)));
      Alert.alert('Couldn’t remove background', e instanceof Error ? e.message : 'Please try again.');
    }
  };

  const deleteLayerById = (id: string) => {
    mutateLayers((prev) => prev.filter((l) => l.id !== id));
    if (selectedLayerId === id) setSelectedLayerId(null);
  };
  const deleteSelectedLayer = () => {
    if (selectedLayerId) deleteLayerById(selectedLayerId);
  };

  const duplicateLayer = (id: string) => {
    const dupId = newLayerId();
    mutateLayers((prev) => {
      const idx = prev.findIndex((l) => l.id === id);
      if (idx === -1) return prev;
      const src = prev[idx];
      const copy: Layer = { ...src, id: dupId, transform: { ...src.transform, x: src.transform.x + 18, y: src.transform.y + 18 } };
      return [...prev.slice(0, idx + 1), copy, ...prev.slice(idx + 1)];
    });
    setSelectedLayerId(dupId);
  };

  const moveLayer = (id: string, direction: 'up' | 'down') => {
    mutateLayers((prev) => {
      const idx = prev.findIndex((l) => l.id === id);
      const swapWith = direction === 'up' ? idx + 1 : idx - 1;
      if (idx === -1 || swapWith < 0 || swapWith >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[swapWith]] = [next[swapWith], next[idx]];
      return next;
    });
  };

  const toggleLock = (id: string) => mutateLayers((prev) => prev.map((l) => (l.id === id ? { ...l, locked: !l.locked } : l)));
  const toggleHidden = (id: string) => mutateLayers((prev) => prev.map((l) => (l.id === id ? { ...l, hidden: !l.hidden } : l)));
  const changeOpacity = (id: string, v: number) => setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, opacity: v } : l)));

  const editSelectedText = () => {
    if (!selectedLayer || selectedLayer.data.kind !== 'text') return;
    setEditingTextLayerId(selectedLayer.id);
    setTextModalVisible(true);
  };

  const pickBackgroundPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1, allowsEditing: false });
    if (!result.canceled && result.assets?.[0]) {
      setImageUri(result.assets[0].uri);
      setGradient(null);
      canvasRef.current?.resetBackgroundTransform();
      setActiveTool('none');
    }
  };
  const pickGradientBackground = (g: [string, string]) => {
    setGradient(g);
    setImageUri(null);
  };
  const clearBackground = () => {
    setGradient(null);
    setImageUri(null);
  };

  const toggleTool = (tool: Tool) => {
    setSelectedLayerId(null);
    setActiveTool((prev) => (prev === tool ? 'none' : tool));
  };

  const handleDone = async () => {
    setExporting(true);
    setSelectedLayerId(null);
    setActiveTool('none');
    try {
      await new Promise((r) => setTimeout(r, 60)); // let selection borders clear before capture
      const uri = await shotRef.current?.capture?.();
      if (!uri) throw new Error('Could not capture image');
      let finalUri = uri;
      if (Platform.OS === 'android' && !uri.startsWith('file://')) {
        finalUri = `file://${uri}`;
      }
      if (returnScreen) {
        navigation.navigate({ name: returnScreen, params: { [returnParamKey]: finalUri }, merge: true });
      } else {
        navigation.navigate('PosterResult', { imageUri: finalUri });
      }
    } catch (e) {
      Alert.alert('Export failed', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const canvasContainerStyle = { width: canvasWidth, height: canvasHeight };

  if (!fontsLoaded) {
    return (
      <SafeAreaView style={[styles.container, styles.loadingWrap, { backgroundColor: theme.COLORS.background }]}>
        <ActivityIndicator size="large" color={theme.COLORS.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.COLORS.background }]} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="close" size={26} color={theme.COLORS.text} />
        </TouchableOpacity>

        <View style={styles.topBarCenter}>
          <TouchableOpacity onPress={undo} disabled={history.length === 0} style={styles.iconBtn}>
            <Ionicons name="arrow-undo" size={20} color={history.length === 0 ? theme.COLORS.border : theme.COLORS.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={redo} disabled={future.length === 0} style={styles.iconBtn}>
            <Ionicons name="arrow-redo" size={20} color={future.length === 0 ? theme.COLORS.border : theme.COLORS.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.topBarRight}>
          {selectedLayer?.data.kind === 'image' && (
            <TouchableOpacity onPress={() => removeBackgroundForImage(selectedLayer.id)} disabled={selectedLayer.data.removingBackground} style={styles.iconBtn}>
              {selectedLayer.data.removingBackground ? (
                <ActivityIndicator size="small" color={theme.COLORS.primary} />
              ) : (
                <Ionicons name="cut-outline" size={20} color={theme.COLORS.text} />
              )}
            </TouchableOpacity>
          )}
          {selectedLayer?.data.kind === 'text' && (
            <TouchableOpacity onPress={editSelectedText} style={styles.iconBtn}>
              <Ionicons name="create-outline" size={22} color={theme.COLORS.text} />
            </TouchableOpacity>
          )}
          {selectedLayer && (
            <TouchableOpacity onPress={deleteSelectedLayer} style={styles.iconBtn}>
              <Ionicons name="trash-outline" size={22} color={theme.COLORS.error} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={handleDone} disabled={exporting} style={[styles.doneBtn, { backgroundColor: theme.COLORS.primary }]}>
            {exporting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.doneText}>Done</Text>}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.canvasWrap}>
        {transparentBackground && <Checkerboard width={canvasWidth} height={canvasHeight} />}
        <ViewShot ref={shotRef} options={{ format: 'png', quality: 1 }} style={canvasContainerStyle}>
          <EditorCanvas
            ref={canvasRef}
            imageUri={imageUri}
            backgroundGradient={gradient}
            transparentBackground={transparentBackground}
            width={canvasWidth}
            height={canvasHeight}
            filterMatrix={filterMatrix}
            cropEnabled={activeTool === 'crop'}
            layers={layers}
            selectedLayerId={selectedLayerId}
            onSelectLayer={setSelectedLayerId}
            onChangeLayerTransform={handleChangeLayerTransform}
          />
        </ViewShot>
      </View>

      {activeTool === 'background' && (
        <View style={styles.panel}>
          <BackgroundPanel
            activeGradient={gradient}
            hasImage={!!imageUri}
            onPickGradient={pickGradientBackground}
            onPickPhoto={pickBackgroundPhoto}
            onClear={clearBackground}
          />
        </View>
      )}
      {activeTool === 'filters' && (
        <View style={styles.panel}>
          <FiltersPanel selectedKey={filterKey} onSelect={setFilterKey} />
        </View>
      )}
      {activeTool === 'adjust' && (
        <View style={styles.panel}>
          <AdjustPanel adjustments={adjustments} onChange={setAdjustments} />
        </View>
      )}
      {activeTool === 'stickers' && (
        <View style={[styles.panel, styles.stickerPanel]}>
          <StickerPanel onPick={addStickerLayer} />
        </View>
      )}
      {activeTool === 'shapes' && (
        <View style={styles.panel}>
          <ShapePanel onAdd={addShapeLayer} />
        </View>
      )}
      {activeTool === 'layers' && (
        <View style={[styles.panel, styles.layersPanelWrap]}>
          <LayersPanel
            layers={layers}
            selectedLayerId={selectedLayerId}
            onSelect={setSelectedLayerId}
            onToggleLock={toggleLock}
            onToggleHidden={toggleHidden}
            onChangeOpacity={changeOpacity}
            onDuplicate={duplicateLayer}
            onDelete={deleteLayerById}
            onMove={moveLayer}
          />
        </View>
      )}
      {activeTool === 'crop' && (
        <View style={styles.panel}>
          <Text style={[styles.hint, { color: theme.COLORS.textMuted }]}>Drag to reposition, pinch to zoom</Text>
        </View>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.toolbar, { borderTopColor: theme.COLORS.border }]} contentContainerStyle={styles.toolbarContent}>
        <ToolButton icon="color-palette-outline" label="Background" active={activeTool === 'background'} onPress={() => toggleTool('background')} />
        {imageUri && <ToolButton icon="crop-outline" label="Crop" active={activeTool === 'crop'} onPress={() => toggleTool('crop')} />}
        {imageUri && <ToolButton icon="color-filter-outline" label="Filters" active={activeTool === 'filters'} onPress={() => toggleTool('filters')} />}
        {imageUri && <ToolButton icon="options-outline" label="Adjust" active={activeTool === 'adjust'} onPress={() => toggleTool('adjust')} />}
        <ToolButton icon="text-outline" label="Text" active={false} onPress={addTextLayer} />
        <ToolButton icon="image-outline" label="Photo" active={false} onPress={addImageLayer} />
        <ToolButton icon="shapes-outline" label="Shapes" active={activeTool === 'shapes'} onPress={() => toggleTool('shapes')} />
        <ToolButton icon="happy-outline" label="Stickers" active={activeTool === 'stickers'} onPress={() => toggleTool('stickers')} />
        <ToolButton icon="layers-outline" label="Layers" active={activeTool === 'layers'} onPress={() => toggleTool('layers')} />
      </ScrollView>

      <TextEditorModal
        visible={textModalVisible}
        initial={editingTextLayerId ? (layers.find((l) => l.id === editingTextLayerId)?.data as TextLayerData) : undefined}
        suggestContext={templateCategory ?? mode}
        onCancel={() => { setTextModalVisible(false); setEditingTextLayerId(null); }}
        onSave={saveTextLayer}
      />
    </SafeAreaView>
  );
}

function ToolButton({ icon, label, active, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; active: boolean; onPress: () => void }) {
  const { theme } = useTheme();
  return (
    <TouchableOpacity onPress={onPress} style={styles.toolBtn}>
      <Ionicons name={icon} size={22} color={active ? theme.COLORS.primary : theme.COLORS.text} />
      <Text style={[styles.toolLabel, { color: active ? theme.COLORS.primary : theme.COLORS.textMuted }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingWrap: { alignItems: 'center', justifyContent: 'center' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  topBarCenter: { flexDirection: 'row', alignItems: 'center' },
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  iconBtn: { padding: 8 },
  doneBtn: { paddingHorizontal: 18, paddingVertical: 9, borderRadius: 999, marginLeft: 2, minWidth: 64, alignItems: 'center' },
  doneText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  canvasWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  panel: { paddingVertical: 14, minHeight: 90, justifyContent: 'center' },
  stickerPanel: { maxHeight: 220 },
  layersPanelWrap: { minHeight: 90, maxHeight: 260 },
  hint: { textAlign: 'center', fontSize: 13 },
  toolbar: {
    borderTopWidth: 1,
    flexGrow: 0,
  },
  toolbarContent: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4,
  },
  toolBtn: { alignItems: 'center', gap: 4, paddingHorizontal: 12 },
  toolLabel: { fontSize: 11, fontWeight: '600' },
});
