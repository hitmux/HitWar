export interface BuildingMetaData {
  id: string;
  price: number;
  radius: number;
  hp: number;
  displayName: string;
}

export const BUILDING_META: Record<string, BuildingMetaData> = {
  Collector: {
    id: 'Collector',
    price: 800,
    radius: 15,
    hp: 3000,
    displayName: 'Gold Mine'
  },
  Treatment: {
    id: 'Treatment',
    price: 1200,
    radius: 10,
    hp: 7500,
    displayName: 'Repair Tower'
  }
};

export function getBuildingMeta(buildingType: string): BuildingMetaData | undefined {
  return BUILDING_META[buildingType];
}

export function isBuildingTypeValid(buildingType: string): boolean {
  return buildingType in BUILDING_META;
}
