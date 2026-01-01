// Category-related type definitions

export type CategoryStatus = "active" | "inactive" | "private";

export interface Category {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  icon: string | null;
  bannerImage?: string | null;
  rules?: string | null;
  postCount: number;
  status: CategoryStatus | string;
  creatorId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CategorySelectorItem {
  id: string;
  name: string;
  displayName: string;
  description: string;
  icon?: string;
  postCount: number;
  isTrending?: boolean;
}

export interface CreateCategoryInput {
  name: string;
  displayName: string;
  description?: string;
  icon?: string;
  bannerImage?: string;
  rules?: string;
}

export interface UpdateCategoryInput {
  name?: string;
  displayName?: string;
  description?: string;
  icon?: string;
  bannerImage?: string;
  rules?: string;
  status?: CategoryStatus;
}
