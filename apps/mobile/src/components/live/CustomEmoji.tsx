import React from "react";
import Svg, { Circle, Ellipse, Path, Defs, RadialGradient, Stop } from "react-native-svg";

export type CustomEmojiType = "laugh" | "cry" | "fire" | "clap" | "love" | "shocked" | "blush" | "inlove"
  | "wink" | "angry" | "cool" | "kiss" | "sleepy" | "party";

interface CustomEmojiProps {
  type: CustomEmojiType;
  size?: number;
}

function LaughEmoji({ size = 40 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id="lgFace" cx="45%" cy="35%" r="60%">
          <Stop offset="0%" stopColor="#FFE066" />
          <Stop offset="100%" stopColor="#FFB800" />
        </RadialGradient>
        <RadialGradient id="lgBlush" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="#FF7C7C" stopOpacity="0.7" />
          <Stop offset="100%" stopColor="#FF7C7C" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Circle cx="50" cy="50" r="47" fill="url(#lgFace)" />
      <Circle cx="50" cy="50" r="47" fill="none" stroke="#E6A000" strokeWidth="1.5" />
      <Path d="M 22 36 Q 30 28 38 36" stroke="#7A4F00" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <Path d="M 62 36 Q 70 28 78 36" stroke="#7A4F00" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <Path d="M 26 36 Q 22 45 24 52 Q 26 58 30 54 Q 32 48 28 40 Z" fill="#7EC8F0" opacity="0.9" />
      <Path d="M 74 36 Q 78 45 76 52 Q 74 58 70 54 Q 68 48 72 40 Z" fill="#7EC8F0" opacity="0.9" />
      <Ellipse cx="22" cy="62" rx="10" ry="6" fill="url(#lgBlush)" />
      <Ellipse cx="78" cy="62" rx="10" ry="6" fill="url(#lgBlush)" />
      <Path d="M 22 58 Q 50 88 78 58 Q 64 76 50 78 Q 36 76 22 58 Z" fill="#7A2E00" />
      <Path d="M 30 60 Q 50 72 70 60 Q 64 66 50 67 Q 36 66 30 60 Z" fill="#FFFFFF" />
      <Ellipse cx="50" cy="74" rx="10" ry="6" fill="#FF6B6B" />
      <Ellipse cx="35" cy="28" rx="6" ry="4" fill="white" opacity="0.4" transform="rotate(-30, 35, 28)" />
    </Svg>
  );
}

function CryEmoji({ size = 40 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id="crFace" cx="45%" cy="35%" r="60%">
          <Stop offset="0%" stopColor="#FFE066" />
          <Stop offset="100%" stopColor="#FFB800" />
        </RadialGradient>
        <RadialGradient id="crTear" cx="50%" cy="0%" r="100%">
          <Stop offset="0%" stopColor="#A8DEFF" />
          <Stop offset="100%" stopColor="#4FA8D8" />
        </RadialGradient>
      </Defs>
      <Circle cx="50" cy="50" r="47" fill="url(#crFace)" />
      <Circle cx="50" cy="50" r="47" fill="none" stroke="#E6A000" strokeWidth="1.5" />
      <Path d="M 22 28 Q 30 22 38 28" stroke="#7A4F00" strokeWidth="3" fill="none" strokeLinecap="round" />
      <Path d="M 62 28 Q 70 22 78 28" stroke="#7A4F00" strokeWidth="3" fill="none" strokeLinecap="round" />
      <Ellipse cx="30" cy="40" rx="8" ry="9" fill="#7A4F00" />
      <Ellipse cx="70" cy="40" rx="8" ry="9" fill="#7A4F00" />
      <Circle cx="33" cy="37" r="3" fill="white" opacity="0.8" />
      <Circle cx="73" cy="37" r="3" fill="white" opacity="0.8" />
      <Ellipse cx="30" cy="46" rx="7" ry="3" fill="#A8DEFF" opacity="0.7" />
      <Ellipse cx="70" cy="46" rx="7" ry="3" fill="#A8DEFF" opacity="0.7" />
      <Path d="M 26 48 Q 20 62 22 74 Q 24 82 30 78 Q 34 70 28 58 Z" fill="url(#crTear)" opacity="0.95" />
      <Path d="M 74 48 Q 80 62 78 74 Q 76 82 70 78 Q 66 70 72 58 Z" fill="url(#crTear)" opacity="0.95" />
      <Path d="M 22 80 Q 26 90 30 82 Z" fill="#4FA8D8" />
      <Path d="M 78 80 Q 74 90 70 82 Z" fill="#4FA8D8" />
      <Path d="M 30 72 Q 50 60 70 72" stroke="#7A2E00" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <Ellipse cx="35" cy="28" rx="6" ry="4" fill="white" opacity="0.4" transform="rotate(-30, 35, 28)" />
    </Svg>
  );
}

function FireEmoji({ size = 40 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id="fireOuter" cx="50%" cy="70%" r="65%">
          <Stop offset="0%" stopColor="#FF7A00" />
          <Stop offset="100%" stopColor="#E63900" />
        </RadialGradient>
        <RadialGradient id="fireInner" cx="50%" cy="75%" r="55%">
          <Stop offset="0%" stopColor="#FFE066" />
          <Stop offset="100%" stopColor="#FFA800" />
        </RadialGradient>
      </Defs>
      <Path d="M 50 8 Q 74 34 68 54 Q 66 62 58 62 Q 64 50 54 38 Q 52 54 40 60 Q 26 66 26 80 Q 26 94 50 96 Q 78 94 76 70 Q 74 56 62 48 Q 66 62 58 68 Q 46 76 34 68 Q 22 60 24 46 Q 26 30 42 20 Q 38 30 42 36 Q 46 20 50 8 Z" fill="url(#fireOuter)" />
      <Path d="M 50 40 Q 60 52 56 64 Q 54 72 46 72 Q 50 64 44 56 Q 40 66 46 74 Q 40 78 38 70 Q 34 60 42 50 Q 40 58 44 60 Q 46 48 50 40 Z" fill="url(#fireInner)" />
    </Svg>
  );
}

function ClapEmoji({ size = 40 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id="clapSkin" cx="45%" cy="35%" r="65%">
          <Stop offset="0%" stopColor="#FFCB8E" />
          <Stop offset="100%" stopColor="#E8A05C" />
        </RadialGradient>
      </Defs>
      <Path d="M 20 55 Q 14 40 22 28 Q 28 20 34 26 Q 38 18 44 24 Q 48 30 46 38 L 50 60 Q 50 72 40 76 Q 28 78 22 68 Q 18 62 20 55 Z" fill="url(#clapSkin)" stroke="#C97F3E" strokeWidth="1.5" />
      <Path d="M 80 55 Q 86 40 78 28 Q 72 20 66 26 Q 62 18 56 24 Q 52 30 54 38 L 50 60 Q 50 72 60 76 Q 72 78 78 68 Q 82 62 80 55 Z" fill="url(#clapSkin)" stroke="#C97F3E" strokeWidth="1.5" />
      <Path d="M 30 22 L 26 10 M 40 18 L 38 6 M 60 18 L 62 6 M 70 22 L 74 10" stroke="#FFD54F" strokeWidth="3" strokeLinecap="round" />
    </Svg>
  );
}

function LoveEmoji({ size = 40 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id="loveHeart" cx="40%" cy="30%" r="70%">
          <Stop offset="0%" stopColor="#FF8FA3" />
          <Stop offset="100%" stopColor="#E8304F" />
        </RadialGradient>
      </Defs>
      <Path
        d="M 50 88 C 20 66 8 46 8 30 C 8 14 20 4 34 4 C 42 4 48 8 50 16 C 52 8 58 4 66 4 C 80 4 92 14 92 30 C 92 46 80 66 50 88 Z"
        fill="url(#loveHeart)"
      />
      <Ellipse cx="30" cy="24" rx="10" ry="6" fill="white" opacity="0.35" transform="rotate(-25, 30, 24)" />
    </Svg>
  );
}

function ShockedEmoji({ size = 40 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id="shFace" cx="45%" cy="35%" r="60%">
          <Stop offset="0%" stopColor="#FFE066" />
          <Stop offset="100%" stopColor="#FFB800" />
        </RadialGradient>
      </Defs>
      <Circle cx="50" cy="50" r="47" fill="url(#shFace)" />
      <Circle cx="50" cy="50" r="47" fill="none" stroke="#E6A000" strokeWidth="1.5" />
      <Path d="M 20 34 Q 30 20 40 30" stroke="#7A4F00" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <Path d="M 60 30 Q 70 20 80 34" stroke="#7A4F00" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <Circle cx="31" cy="44" r="7" fill="#5A3600" />
      <Circle cx="69" cy="44" r="7" fill="#5A3600" />
      <Circle cx="33" cy="41" r="2.2" fill="white" />
      <Circle cx="71" cy="41" r="2.2" fill="white" />
      <Ellipse cx="50" cy="68" rx="12" ry="16" fill="#5A2E00" />
      <Ellipse cx="50" cy="66" rx="8" ry="11" fill="#8B4A1E" />
    </Svg>
  );
}

function BlushEmoji({ size = 40 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id="blFace" cx="45%" cy="35%" r="60%">
          <Stop offset="0%" stopColor="#FFE066" />
          <Stop offset="100%" stopColor="#FFB800" />
        </RadialGradient>
        <RadialGradient id="blBlush" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="#FF6B8A" stopOpacity="0.85" />
          <Stop offset="100%" stopColor="#FF6B8A" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Circle cx="50" cy="50" r="47" fill="url(#blFace)" />
      <Circle cx="50" cy="50" r="47" fill="none" stroke="#E6A000" strokeWidth="1.5" />
      <Path d="M 24 40 Q 32 34 40 40" stroke="#7A4F00" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <Path d="M 60 40 Q 68 34 76 40" stroke="#7A4F00" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <Ellipse cx="18" cy="60" rx="12" ry="8" fill="url(#blBlush)" />
      <Ellipse cx="82" cy="60" rx="12" ry="8" fill="url(#blBlush)" />
      <Path d="M 36 68 Q 50 78 64 68" stroke="#7A2E00" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <Ellipse cx="35" cy="28" rx="6" ry="4" fill="white" opacity="0.4" transform="rotate(-30, 35, 28)" />
    </Svg>
  );
}

function InLoveEmoji({ size = 40 }: { size?: number }) {
  const heartEye = (cx: number) => (
    <Path
      d={`M ${cx} ${48} C ${cx - 9} ${41} ${cx - 13} ${34} ${cx - 13} ${29} C ${cx - 13} ${25} ${cx - 10} ${22} ${cx - 6} ${22} C ${cx - 3} ${22} ${cx - 1} ${23.5} ${cx} ${26} C ${cx + 1} ${23.5} ${cx + 3} ${22} ${cx + 6} ${22} C ${cx + 10} ${22} ${cx + 13} ${25} ${cx + 13} ${29} C ${cx + 13} ${34} ${cx + 9} ${41} ${cx} ${48} Z`}
      fill="#E8304F"
    />
  );
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id="ilFace" cx="45%" cy="35%" r="60%">
          <Stop offset="0%" stopColor="#FFE066" />
          <Stop offset="100%" stopColor="#FFB800" />
        </RadialGradient>
      </Defs>
      <Circle cx="50" cy="50" r="47" fill="url(#ilFace)" />
      <Circle cx="50" cy="50" r="47" fill="none" stroke="#E6A000" strokeWidth="1.5" />
      {heartEye(31)}
      {heartEye(69)}
      <Path d="M 32 68 Q 50 82 68 68" stroke="#7A2E00" strokeWidth="4" fill="none" strokeLinecap="round" />
    </Svg>
  );
}

function WinkEmoji({ size = 40 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id="wkFace" cx="45%" cy="35%" r="60%">
          <Stop offset="0%" stopColor="#FFE066" />
          <Stop offset="100%" stopColor="#FFB800" />
        </RadialGradient>
        <RadialGradient id="wkBlush" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="#FF7C7C" stopOpacity="0.6" />
          <Stop offset="100%" stopColor="#FF7C7C" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Circle cx="50" cy="50" r="47" fill="url(#wkFace)" />
      <Circle cx="50" cy="50" r="47" fill="none" stroke="#E6A000" strokeWidth="1.5" />
      <Path d="M 22 40 Q 30 44 38 40" stroke="#7A4F00" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <Circle cx="70" cy="40" r="7" fill="#5A3600" />
      <Circle cx="72" cy="37" r="2" fill="white" opacity="0.8" />
      <Ellipse cx="22" cy="60" rx="9" ry="6" fill="url(#wkBlush)" />
      <Ellipse cx="78" cy="60" rx="9" ry="6" fill="url(#wkBlush)" />
      <Path d="M 30 66 Q 50 82 76 62" stroke="#7A2E00" strokeWidth="4" fill="none" strokeLinecap="round" />
      <Ellipse cx="35" cy="28" rx="6" ry="4" fill="white" opacity="0.4" transform="rotate(-30, 35, 28)" />
    </Svg>
  );
}

function AngryEmoji({ size = 40 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id="agFace" cx="45%" cy="35%" r="60%">
          <Stop offset="0%" stopColor="#FFB199" />
          <Stop offset="100%" stopColor="#FF7A47" />
        </RadialGradient>
      </Defs>
      <Circle cx="50" cy="50" r="47" fill="url(#agFace)" />
      <Circle cx="50" cy="50" r="47" fill="none" stroke="#D14A1F" strokeWidth="1.5" />
      <Path d="M 20 32 L 40 40" stroke="#6B2000" strokeWidth="4" strokeLinecap="round" />
      <Path d="M 80 32 L 60 40" stroke="#6B2000" strokeWidth="4" strokeLinecap="round" />
      <Ellipse cx="32" cy="48" rx="7" ry="8" fill="#4A1500" />
      <Ellipse cx="68" cy="48" rx="7" ry="8" fill="#4A1500" />
      <Path d="M 30 76 Q 50 62 70 76" stroke="#5A1A00" strokeWidth="4" fill="none" strokeLinecap="round" />
      <Path d="M 12 52 Q 8 44 14 38" stroke="#D14A1F" strokeWidth="3" fill="none" strokeLinecap="round" />
      <Path d="M 88 52 Q 92 44 86 38" stroke="#D14A1F" strokeWidth="3" fill="none" strokeLinecap="round" />
    </Svg>
  );
}

function CoolEmoji({ size = 40 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id="clFace" cx="45%" cy="35%" r="60%">
          <Stop offset="0%" stopColor="#FFE066" />
          <Stop offset="100%" stopColor="#FFB800" />
        </RadialGradient>
        <RadialGradient id="clLens" cx="35%" cy="30%" r="80%">
          <Stop offset="0%" stopColor="#5B7A9C" />
          <Stop offset="100%" stopColor="#1A2E44" />
        </RadialGradient>
      </Defs>
      <Circle cx="50" cy="50" r="47" fill="url(#clFace)" />
      <Circle cx="50" cy="50" r="47" fill="none" stroke="#E6A000" strokeWidth="1.5" />
      <Path d="M 16 38 L 84 38 L 80 54 Q 78 60 68 60 L 60 60 Q 52 60 50 48 Q 48 60 40 60 L 32 60 Q 22 60 20 54 Z" fill="#1A1A1A" />
      <Ellipse cx="32" cy="47" rx="10" ry="8" fill="url(#clLens)" />
      <Ellipse cx="68" cy="47" rx="10" ry="8" fill="url(#clLens)" />
      <Ellipse cx="28" cy="43" rx="3" ry="2" fill="white" opacity="0.5" />
      <Path d="M 34 74 Q 50 82 66 74" stroke="#7A2E00" strokeWidth="4" fill="none" strokeLinecap="round" />
    </Svg>
  );
}

function KissEmoji({ size = 40 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id="ksFace" cx="45%" cy="35%" r="60%">
          <Stop offset="0%" stopColor="#FFE066" />
          <Stop offset="100%" stopColor="#FFB800" />
        </RadialGradient>
        <RadialGradient id="ksBlush" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="#FF6B8A" stopOpacity="0.8" />
          <Stop offset="100%" stopColor="#FF6B8A" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Circle cx="50" cy="50" r="47" fill="url(#ksFace)" />
      <Circle cx="50" cy="50" r="47" fill="none" stroke="#E6A000" strokeWidth="1.5" />
      <Path d="M 22 38 Q 30 32 38 38" stroke="#7A4F00" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <Path d="M 62 38 Q 70 32 78 38" stroke="#7A4F00" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <Path d="M 20 42 Q 30 46 40 42" stroke="#7A4F00" strokeWidth="3" fill="none" strokeLinecap="round" />
      <Path d="M 60 42 Q 70 46 80 42" stroke="#7A4F00" strokeWidth="3" fill="none" strokeLinecap="round" />
      <Ellipse cx="18" cy="58" rx="11" ry="7" fill="url(#ksBlush)" />
      <Ellipse cx="82" cy="58" rx="11" ry="7" fill="url(#ksBlush)" />
      <Path d="M 42 68 Q 50 60 58 68 Q 62 76 50 80 Q 38 76 42 68 Z" fill="#E8304F" />
      <Ellipse cx="35" cy="28" rx="6" ry="4" fill="white" opacity="0.4" transform="rotate(-30, 35, 28)" />
    </Svg>
  );
}

function SleepyEmoji({ size = 40 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id="slFace" cx="45%" cy="35%" r="60%">
          <Stop offset="0%" stopColor="#FFE066" />
          <Stop offset="100%" stopColor="#FFB800" />
        </RadialGradient>
      </Defs>
      <Circle cx="50" cy="50" r="47" fill="url(#slFace)" />
      <Circle cx="50" cy="50" r="47" fill="none" stroke="#E6A000" strokeWidth="1.5" />
      <Path d="M 20 44 Q 30 50 40 44" stroke="#7A4F00" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <Path d="M 60 44 Q 70 50 80 44" stroke="#7A4F00" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <Ellipse cx="50" cy="72" rx="6" ry="4" fill="#7A4F00" />
      <Path d="M 66 22 L 70 26 L 66 30" stroke="#5A7FB0" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M 74 14 L 79 19 L 74 24" stroke="#5A7FB0" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M 84 6 L 90 12 L 84 18" stroke="#5A7FB0" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function PartyEmoji({ size = 40 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id="ptFace" cx="45%" cy="40%" r="60%">
          <Stop offset="0%" stopColor="#FFE066" />
          <Stop offset="100%" stopColor="#FFB800" />
        </RadialGradient>
        <RadialGradient id="ptBlush" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="#FF7C7C" stopOpacity="0.7" />
          <Stop offset="100%" stopColor="#FF7C7C" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Circle cx="50" cy="54" r="43" fill="url(#ptFace)" />
      <Circle cx="50" cy="54" r="43" fill="none" stroke="#E6A000" strokeWidth="1.5" />
      <Path d="M 38 20 L 68 26 L 40 40 Z" fill="#E8304F" />
      <Circle cx="38" cy="20" r="4.5" fill="#FFD54F" />
      <Path d="M 28 40 Q 30 30 40 40" stroke="#7A4F00" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <Path d="M 60 40 Q 70 32 78 40" stroke="#7A4F00" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <Ellipse cx="24" cy="64" rx="9" ry="6" fill="url(#ptBlush)" />
      <Ellipse cx="80" cy="64" rx="9" ry="6" fill="url(#ptBlush)" />
      <Path d="M 26 62 Q 50 92 78 62 Q 64 80 50 82 Q 36 80 26 62 Z" fill="#7A2E00" />
      <Path d="M 34 64 Q 50 76 70 64 Q 64 70 50 71 Q 36 70 34 64 Z" fill="#FFFFFF" />
      <Circle cx="10" cy="30" r="3" fill="#5AC8FA" />
      <Circle cx="90" cy="24" r="2.5" fill="#FF6B8A" />
      <Circle cx="86" cy="52" r="2" fill="#FFD54F" />
    </Svg>
  );
}

export default function CustomEmoji({ type, size = 40 }: CustomEmojiProps) {
  switch (type) {
    case "laugh": return <LaughEmoji size={size} />;
    case "cry": return <CryEmoji size={size} />;
    case "fire": return <FireEmoji size={size} />;
    case "clap": return <ClapEmoji size={size} />;
    case "love": return <LoveEmoji size={size} />;
    case "shocked": return <ShockedEmoji size={size} />;
    case "blush": return <BlushEmoji size={size} />;
    case "inlove": return <InLoveEmoji size={size} />;
    case "wink": return <WinkEmoji size={size} />;
    case "angry": return <AngryEmoji size={size} />;
    case "cool": return <CoolEmoji size={size} />;
    case "kiss": return <KissEmoji size={size} />;
    case "sleepy": return <SleepyEmoji size={size} />;
    case "party": return <PartyEmoji size={size} />;
    default: return <LaughEmoji size={size} />;
  }
}
