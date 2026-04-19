export interface ShootingPlan {
  collection_name: string;
  art_direction: {
    decor: string;
    light: string;
    mood: string;
  };
  casting: {
    adults: { id: string; role: string; ethnic_profile: string }[];
    kids: { id: string; role: string; ethnic_profile: string }[];
  };
  scenes: {
    scene_id: string;
    type: string;
    required_products: string[];
    required_interaction: string;
    motifs_visible: number;
    decor_zone: string;
    framing: string;
    deliverables: string[];
    image_prompt: string;
  }[];
  motif_strategy: {
    hero_motifs: string[];
    detail_only_motifs: string[];
  };
  color_strategy: {
    hero_colors: string[];
    secondary_colors: string[];
  };
  shotlist: {
    shot_id: string;
    scene_id: string;
    models: string[];
    product: string;
    color: string;
    motif: string;
    shot_type: string;
  }[];
  planning: {
    day: number;
    title: string;
    description: string;
    shots_count: number;
  }[];
}

export interface ShootingParams {
  adultProducts: string[];
  kidProducts: string[];
  colors: string[];
  motifsCount: number;
  models: { role: string; profile: string }[];
}
