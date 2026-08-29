import React, { useState, useRef, useMemo } from 'react';
import { View, FlatList, Dimensions, ViewToken } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LiveStream } from '../../data/mockLiveStreams';
import LiveStreamPage from './LiveStreamPage';

const { height: SCREEN_H } = Dimensions.get('window');

// TikTok-style swipeable feed: whatever list of streams the caller already
// had on screen (LiveScreen's grid, a category rail, etc.) becomes the
// swipe order here, starting at the tile the user actually tapped. Callers
// that only have a single stream in hand (a deep link, a notification) just
// pass that one — the feed degenerates to a single non-swipeable page,
// which is exactly the old LiveViewerScreen behavior.
export default function LiveViewerScreen({ navigation, route }: any) {
  const singleStream: LiveStream | undefined = route?.params?.stream;
  const streamList: LiveStream[] | undefined = route?.params?.streams;
  const streams = useMemo(
    () => (streamList && streamList.length > 0 ? streamList : singleStream ? [singleStream] : []),
    [streamList, singleStream],
  );
  const initialIndex = Math.min(
    Math.max(route?.params?.initialIndex ?? 0, 0),
    Math.max(streams.length - 1, 0),
  );

  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const viewabilityConfigRef = useRef({ itemVisiblePercentThreshold: 60 });
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && typeof viewableItems[0].index === 'number') {
      setActiveIndex(viewableItems[0].index);
    }
  });

  if (streams.length === 0) return null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }} edges={['top', 'bottom']}>
      <FlatList
        style={{ flex: 1 }}
        data={streams}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          // A plain fixed-height box, not a flex:1 child — RN-Web translates
          // flex:1 to `flex: 1 1 0%`, which overrides an explicit height set
          // on the very same node and collapses every page to an equal
          // fraction of the list instead of one full screen each. Keeping
          // the fixed size on this outer node and flex:1 only inside
          // LiveStreamPage (filling a now non-flex parent) avoids that.
          <View style={{ height: SCREEN_H, width: '100%' }}>
            <LiveStreamPage stream={item} navigation={navigation} isActive={index === activeIndex} />
          </View>
        )}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        initialScrollIndex={initialIndex}
        getItemLayout={(_, index) => ({ length: SCREEN_H, offset: SCREEN_H * index, index })}
        viewabilityConfig={viewabilityConfigRef.current}
        onViewableItemsChanged={onViewableItemsChanged.current}
        windowSize={3}
        maxToRenderPerBatch={2}
        removeClippedSubviews
      />
    </SafeAreaView>
  );
}
