import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import ViewShot from 'react-native-view-shot';
import * as FileSystem from 'expo-file-system';
import { useTheme } from '../../context/ThemeContext';
import EditorCanvas, { EditorCanvasHandle } from './EditorCanvas';
import FiltersPanel from './panels/FiltersPanel';
import AdjustPanel from './panels/AdjustPanel';
import StickerPanel from './panels/StickerPanel';
import TextEditorModal from './panels/TextEditorModal';
import { buildFinalMatrix, FILTER_PRESETS, IDENTITY_MATRIX } from './filters';
import {
  Adjustments,
  DEFAULT_ADJUSTMENTS,
  Layer,
  LayerTransform,
  TextLayerData,
  makeTransform,
  newLayerId,
} from './types';

type Tool = 'none' | 'crop' | 'filters' | 'adjust' | 'stickers';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function MediaEditorScreen({ navigation, route }: any) {
  const { theme } = useTheme();
  const {
    initialImageUri = null,
    initialGradient = null,
    initialLayers = [],
    aspectRatio,
    mode = 'photo',
    returnScreen,
    returnParamKey = 'editedImageUri',
  } = route.params ?? {};

  const ratio = aspectRatio ?? (mode === 'poster' ? 4 / 5 : 1);
  const canvasWidth = SCREEN_WIDTH - 32;
  const canvasHeight = canvasWidth / ratio;

  const [imageUri, setImageUri] = useState<string | null>(initialImageUri);
  const [gradient] = useState<readonly [string, string] | null>(initialGradient);
  const [layers, setLayers] = useState<Layer[]>(() =>
    (initialLayers as Layer[]).map((l) => ({ ...l, id: l.id || newLayerId() })),
  );
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<Tool>('none');
  const [filterKey, setFilterKey] = useState('original');
  const [adjustments, setAdjustments] = useState<Adjustments>(DEFAULT_ADJUSTMENTS);
  const [textModalVisible, setTextModalVisible] = useState(false);
  const [editingTextLayerId, setEditingTextLayerId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const canvasRef = useRef<EditorCanvasHandle>(null);
  const shotRef = useRef<ViewShot>(null);

  const filterMatrix = useMemo(() => {
    const preset = FILTER_PRESETS.find((f) => f.key === filterKey)?.matrix ?? IDENTITY_MATRIX;
    return buildFinalMatrix(preset, adjustments.brightness, adjustments.contrast, adjustments.saturation);
  }, [filterKey, adjustments]);

  const selectedLayer = layers.find((l) => l.id === selectedLayerId) ?? null;

  const handleChangeLayerTransform = (id: string, t: LayerTransform) => {
    setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, transform: t } : l)));
  };

  const addTextLayer = () => {
    setEditingTextLayerId(null);
    setTextModalVisible(true);
  };

  const saveTextLayer = (data: TextLayerData) => {
    if (editingTextLayerId) {
      setLayers((prev) => prev.map((l) => (l.id === editingTextLayerId ? { ...l, data } : l)));
    } else {
      const id = newLayerId();
      const layer: Layer = { id, data, transform: makeTransform(canvasWidth / 2, canvasHeight / 2) };
      setLayers((prev) => [...prev, layer]);
      setSelectedLayerId(id);
    }
    setTextModalVisible(false);
    setEditingTextLayerId(null);
  };

  const addStickerLayer = (emoji: string) => {
    const id = newLayerId();
    const layer: Layer = {
      id,
      data: { kind: 'sticker', emoji },
      transform: makeTransform(canvasWidth / 2, canvasHeight / 2),
    };
    setLayers((prev) => [...prev, layer]);
    setSelectedLayerId(id);
    setActiveTool('none');
  };

  const deleteSelectedLayer = () => {
    if (!selectedLayerId) return;
    setLayers((prev) => prev.filter((l) => l.id !== selectedLayerId));
    setSelectedLayerId(null);
  };

  const editSelectedText = () => {
    if (!selectedLayer || selectedLayer.data.kind !== 'text') return;
    setEditingTextLayerId(selectedLayer.id);
    setTextModalVisible(true);
  };

  const replacePhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets?.[0]) {
      setImageUri(result.assets[0].uri);
      canvasRef.current?.resetBackgroundTransform();
    }
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

  const canvasContainerStyle = {
    width: canvasWidth,
    height: canvasHeight,
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.COLORS.background }]} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="close" size={26} color={theme.COLORS.text} />
        </TouchableOpacity>
        <View style={styles.topBarRight}>
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
          {imageUri && (
            <TouchableOpacity onPress={replacePhoto} style={styles.iconBtn}>
              <Ionicons name="image-outline" size={22} color={theme.COLORS.text} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={handleDone} disabled={exporting} style={[styles.doneBtn, { backgroundColor: theme.COLORS.primary }]}>
            {exporting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.doneText}>Done</Text>}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.canvasWrap}>
        <ViewShot ref={shotRef} options={{ format: 'png', quality: 1 }} style={canvasContainerStyle}>
          <EditorCanvas
            ref={canvasRef}
            imageUri={imageUri}
            backgroundGradient={gradient}
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
      {activeTool === 'crop' && (
        <View style={styles.panel}>
          <Text style={[styles.hint, { color: theme.COLORS.textMuted }]}>Drag to reposition, pinch to zoom</Text>
        </View>
      )}

      <View style={[styles.toolbar, { borderTopColor: theme.COLORS.border }]}>
        {imageUri && (
          <ToolButton icon="crop-outline" label="Crop" active={activeTool === 'crop'} onPress={() => toggleTool('crop')} />
        )}
        {imageUri && (
          <ToolButton icon="color-filter-outline" label="Filters" active={activeTool === 'filters'} onPress={() => toggleTool('filters')} />
        )}
        {imageUri && (
          <ToolButton icon="options-outline" label="Adjust" active={activeTool === 'adjust'} onPress={() => toggleTool('adjust')} />
        )}
        <ToolButton icon="text-outline" label="Text" active={false} onPress={addTextLayer} />
        <ToolButton icon="happy-outline" label="Stickers" active={activeTool === 'stickers'} onPress={() => toggleTool('stickers')} />
      </View>

      <TextEditorModal
        visible={textModalVisible}
        initial={editingTextLayerId ? (layers.find((l) => l.id === editingTextLayerId)?.data as TextLayerData) : undefined}
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  iconBtn: { padding: 8 },
  doneBtn: { paddingHorizontal: 18, paddingVertical: 9, borderRadius: 999, marginLeft: 4, minWidth: 68, alignItems: 'center' },
  doneText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  canvasWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  panel: { paddingVertical: 14, minHeight: 90, justifyContent: 'center' },
  stickerPanel: { maxHeight: 220 },
  hint: { textAlign: 'center', fontSize: 13 },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  toolBtn: { alignItems: 'center', gap: 4, paddingHorizontal: 10 },
  toolLabel: { fontSize: 11, fontWeight: '600' },
});
