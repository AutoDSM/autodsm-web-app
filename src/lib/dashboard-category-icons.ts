import type { LucideIcon } from "lucide-react";
import {
  Palette,
  Type,
  Image as ImageIcon,
  Ruler,
  Square,
  CornerDownRight,
  Minus,
  Play,
  Layers,
  Droplets,
  LayoutPanelTop,
  MonitorSmartphone,
} from "lucide-react";

/** Lucide icon per dashboard token route slug (sidebar + command palette). */
export const DASHBOARD_CATEGORY_ICONS: Record<string, LucideIcon> = {
  colors: Palette,
  typography: Type,
  assets: ImageIcon,
  spacing: Ruler,
  shadows: Square,
  radii: CornerDownRight,
  borders: Minus,
  animations: Play,
  gradients: Layers,
  opacity: Droplets,
  zindex: LayoutPanelTop,
  breakpoints: MonitorSmartphone,
};
