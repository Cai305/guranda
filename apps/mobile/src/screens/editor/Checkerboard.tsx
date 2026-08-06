import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

const CELL = 16;

/**
 * Purely decorative "transparent background" indicator for the editor UI.
 * Rendered as a sibling BEHIND the ViewShot-captured canvas — never inside
 * it — so it never leaks into the exported PNG's alpha channel.
 */
export default function Checkerboard({ width, height }: { width: number; height: number }) {
  const rows = Math.ceil(height / CELL);
  const cols = Math.ceil(width / CELL);
  const cells = useMemo(() => {
    const out: { key: string; left: number; top: number; dark: boolean }[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        out.push({ key: `${r}_${c}`, left: c * CELL, top: r * CELL, dark: (r + c) % 2 === 0 });
      }
    }
    return out;
  }, [rows, cols]);

  return (
    <View pointerEvents="none" style={[styles.wrap, { width, height, borderRadius: 16 }]}>
      {cells.map((cell) => (
        <View
          key={cell.key}
          style={[
            styles.cell,
            { left: cell.left, top: cell.top, backgroundColor: cell.dark ? '#2A2A34' : '#33333F' },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    overflow: 'hidden',
  },
  cell: {
    position: 'absolute',
    width: CELL,
    height: CELL,
  },
});
