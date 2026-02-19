import {
  Target,
  Rocket,
  Lightbulb,
  Flame,
  Star,
  BookOpen,
  Dumbbell,
  Brain,
  Palette,
  Sprout,
  Zap,
  Trophy,
  Music,
  Cat,
  Coffee,
  Smile,
  type LucideIcon,
} from "lucide-react";

export interface AvatarIconOption {
  name: string;
  icon: LucideIcon;
}

export const AVATAR_ICONS: AvatarIconOption[] = [
  { name: "target", icon: Target },
  { name: "rocket", icon: Rocket },
  { name: "lightbulb", icon: Lightbulb },
  { name: "flame", icon: Flame },
  { name: "star", icon: Star },
  { name: "book-open", icon: BookOpen },
  { name: "dumbbell", icon: Dumbbell },
  { name: "brain", icon: Brain },
  { name: "palette", icon: Palette },
  { name: "sprout", icon: Sprout },
  { name: "zap", icon: Zap },
  { name: "trophy", icon: Trophy },
  { name: "music", icon: Music },
  { name: "cat", icon: Cat },
  { name: "coffee", icon: Coffee },
  { name: "smile", icon: Smile },
];

const iconMap = new Map(AVATAR_ICONS.map((a) => [a.name, a.icon]));

export const DEFAULT_AVATAR_ICON = "target";

export function getAvatarIcon(name: string | null | undefined): LucideIcon {
  return iconMap.get(name || DEFAULT_AVATAR_ICON) || Target;
}
