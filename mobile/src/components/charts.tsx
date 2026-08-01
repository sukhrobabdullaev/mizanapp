/** Bespoke charts: progress ring, pentagon radar, donut, 12-week heatmap. */

import { StyleSheet, Text, View } from 'react-native';
import Svg, {
  Circle,
  G,
  Line,
  Path,
  Polygon,
  Rect,
  Text as SvgText,
} from 'react-native-svg';

import { colors, radius, spacing, typography } from '../theme';
import { useTheme } from '../theme/useTheme';
import type { DimensionKey, HeatmapDay } from '../types/api';
import { DIMENSION_LABEL, DIMENSION_ORDER } from '../types/api';

/* ------------------------------------------------------------ progress ring */

export function ProgressRing({
  ratio,
  size = 96,
  stroke = 9,
  label,
  color = colors.gradientStart,
}: {
  ratio: number;
  size?: number;
  stroke?: number;
  label?: string;
  color?: string;
}) {
  const { palette } = useTheme();
  const clamped = Math.max(0, Math.min(1, ratio));
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <G rotation={-90} origin={`${size / 2}, ${size / 2}`}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={palette.track}
            strokeWidth={stroke}
            fill="none"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${circumference * clamped} ${circumference}`}
            fill="none"
          />
        </G>
      </Svg>
      {label ? (
        <View style={[StyleSheet.absoluteFill, styles.center]}>
          <Text style={[styles.ringLabel, { color: palette.text }]}>{label}</Text>
        </View>
      ) : null}
    </View>
  );
}

/* ------------------------------------------------------------------- radar */

/** Vertex coordinates of a regular pentagon, first point at 12 o'clock. */
function pentagonPoints(
  cx: number,
  cy: number,
  radii: number[],
): { x: number; y: number }[] {
  return radii.map((r, index) => {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / radii.length;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  });
}

const toPolygon = (points: { x: number; y: number }[]): string =>
  points.map((p) => `${p.x},${p.y}`).join(' ');

export function PentagonRadar({
  values,
  size = 260,
}: {
  values: Record<DimensionKey, number>;
  size?: number;
}) {
  const { palette } = useTheme();
  const cx = size / 2;
  const cy = size / 2 + 6;
  const maxRadius = size / 2 - 44;

  const gridLevels = [0.25, 0.5, 0.75, 1];
  const axes = pentagonPoints(cx, cy, DIMENSION_ORDER.map(() => maxRadius));
  const dataPoints = pentagonPoints(
    cx,
    cy,
    DIMENSION_ORDER.map((key) => Math.max(0.02, Math.min(1, values[key] ?? 0)) * maxRadius),
  );

  return (
    <Svg width={size} height={size + 12}>
      {gridLevels.map((level) => (
        <Polygon
          key={level}
          points={toPolygon(pentagonPoints(cx, cy, DIMENSION_ORDER.map(() => maxRadius * level)))}
          stroke={palette.border}
          strokeWidth={1}
          fill="none"
        />
      ))}
      {axes.map((point, index) => (
        <Line
          key={DIMENSION_ORDER[index]}
          x1={cx}
          y1={cy}
          x2={point.x}
          y2={point.y}
          stroke={palette.border}
          strokeWidth={1}
        />
      ))}
      <Polygon
        points={toPolygon(dataPoints)}
        fill={`${colors.gradientStart}26`}
        stroke={colors.gradientStart}
        strokeWidth={2.5}
      />
      {dataPoints.map((point, index) => (
        <Circle
          key={`dot-${DIMENSION_ORDER[index]}`}
          cx={point.x}
          cy={point.y}
          r={4.5}
          fill={palette.card}
          stroke={colors.gradientStart}
          strokeWidth={2.5}
        />
      ))}
      {axes.map((point, index) => {
        const key = DIMENSION_ORDER[index] as DimensionKey;
        const dx = point.x - cx;
        const anchor = Math.abs(dx) < 12 ? 'middle' : dx > 0 ? 'start' : 'end';
        return (
          <SvgText
            key={`label-${key}`}
            x={point.x + (anchor === 'start' ? 8 : anchor === 'end' ? -8 : 0)}
            y={point.y + (index === 0 ? -10 : 14)}
            fontSize={12}
            fontWeight="700"
            fill={palette.text}
            textAnchor={anchor}
          >
            {DIMENSION_LABEL[key]}
          </SvgText>
        );
      })}
    </Svg>
  );
}

/* ------------------------------------------------------------------- donut */

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

/** SVG arc path for one slice of a donut. */
function arcPath(
  cx: number,
  cy: number,
  outer: number,
  inner: number,
  start: number,
  end: number,
): string {
  const large = end - start > Math.PI ? 1 : 0;
  const x1 = cx + outer * Math.cos(start);
  const y1 = cy + outer * Math.sin(start);
  const x2 = cx + outer * Math.cos(end);
  const y2 = cy + outer * Math.sin(end);
  const x3 = cx + inner * Math.cos(end);
  const y3 = cy + inner * Math.sin(end);
  const x4 = cx + inner * Math.cos(start);
  const y4 = cy + inner * Math.sin(start);
  return [
    `M ${x1} ${y1}`,
    `A ${outer} ${outer} 0 ${large} 1 ${x2} ${y2}`,
    `L ${x3} ${y3}`,
    `A ${inner} ${inner} 0 ${large} 0 ${x4} ${y4}`,
    'Z',
  ].join(' ');
}

export function DonutChart({
  slices,
  size = 200,
  centerLabel,
  centerCaption,
}: {
  slices: DonutSlice[];
  size?: number;
  centerLabel?: string;
  centerCaption?: string;
}) {
  const { palette } = useTheme();
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  const cx = size / 2;
  const cy = size / 2;
  const outer = size / 2;
  const inner = size / 2 - 26;

  let cursor = -Math.PI / 2;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        {total <= 0 ? (
          <Circle
            cx={cx}
            cy={cy}
            r={(outer + inner) / 2}
            stroke={palette.track}
            strokeWidth={outer - inner}
            fill="none"
          />
        ) : (
          slices.map((slice) => {
            const sweep = (slice.value / total) * Math.PI * 2;
            const path = arcPath(cx, cy, outer, inner, cursor, cursor + sweep);
            cursor += sweep;
            return <Path key={slice.label} d={path} fill={slice.color} />;
          })
        )}
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>
        {centerCaption ? (
          <Text style={[styles.donutCaption, { color: palette.textMuted }]}>
            {centerCaption}
          </Text>
        ) : null}
        {centerLabel ? (
          <Text style={[styles.donutValue, { color: palette.text }]}>{centerLabel}</Text>
        ) : null}
      </View>
    </View>
  );
}

export function Legend({ slices }: { slices: DonutSlice[] }) {
  const { palette } = useTheme();
  return (
    <View style={styles.legend}>
      {slices.map((slice) => (
        <View key={slice.label} style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: slice.color }]} />
          <Text style={[styles.legendLabel, { color: palette.text }]} numberOfLines={1}>
            {slice.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

/* ----------------------------------------------------------------- heatmap */

/** Amallar bog'i — one column per week, one cell per day. */
export function Heatmap({ days, weeks }: { days: HeatmapDay[]; weeks: number }) {
  const { palette } = useTheme();
  const cell = 14;
  const gap = 4;
  const width = weeks * (cell + gap);
  const height = 7 * (cell + gap);

  const shade = (ratio: number): string => {
    if (ratio <= 0) return palette.track;
    if (ratio < 0.34) return `${colors.gradientEnd}66`;
    if (ratio < 0.67) return colors.gradientEnd;
    if (ratio < 1) return colors.gradientStart;
    return '#0B7C51';
  };

  return (
    <Svg width={width} height={height}>
      {days.map((day, index) => {
        const column = Math.floor(index / 7);
        const row = index % 7;
        return (
          <Rect
            key={day.date}
            x={column * (cell + gap)}
            y={row * (cell + gap)}
            width={cell}
            height={cell}
            rx={4}
            fill={shade(day.ratio)}
          />
        );
      })}
    </Svg>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  ringLabel: { fontSize: 15, fontWeight: '800' },
  donutValue: { fontSize: 22, fontWeight: '800' },
  donutCaption: { ...typography.caption, letterSpacing: 1 },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, width: '45%' },
  legendDot: { width: 10, height: 10, borderRadius: radius.pill },
  legendLabel: { fontSize: 13, fontWeight: '600', flexShrink: 1 },
});
