import type { ComponentType, CSSProperties } from 'react';
import {
  IconShoppingCart,
  IconHome2,
  IconBallFootball,
  IconToolsKitchen2,
  IconPlane,
  IconHanger,
  IconShoppingBag,
  IconCar,
  IconHeartbeat,
  IconReceipt,
} from '@tabler/icons-react';
import type { ExpenseCategory } from '../types';

interface CategoryDef {
  value: ExpenseCategory;
  label: string;
  Icon: ComponentType<{ size?: number | string; style?: CSSProperties }>;
}

export const CATEGORIES: CategoryDef[] = [
  { value: 'dagligvarer',          label: 'Dagligvarer',           Icon: IconShoppingCart  },
  { value: 'hjem_og_hage',         label: 'Hjem og hage',          Icon: IconHome2          },
  { value: 'fritid',               label: 'Fritid',                Icon: IconBallFootball   },
  { value: 'restaurant_og_uteliv', label: 'Restaurant og uteliv',  Icon: IconToolsKitchen2  },
  { value: 'transport_og_reise',   label: 'Transport og reise',    Icon: IconPlane          },
  { value: 'klaer_og_tilbehoer',   label: 'Klær og tilbehør',      Icon: IconHanger         },
  { value: 'ovrig_forbruk',        label: 'Øvrig forbruk',         Icon: IconShoppingBag    },
  { value: 'kjoeretoey',           label: 'Kjøretøy',              Icon: IconCar            },
  { value: 'helse_og_velvare',     label: 'Helse og velvære',      Icon: IconHeartbeat      },
];

export function getCategoryIcon(category?: ExpenseCategory | null): ComponentType<{ size?: number | string; style?: CSSProperties }> {
  return CATEGORIES.find((c) => c.value === category)?.Icon ?? IconReceipt;
}

export function getCategoryLabel(category?: ExpenseCategory | null): string | undefined {
  return CATEGORIES.find((c) => c.value === category)?.label;
}
