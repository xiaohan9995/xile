/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Instructor {
  id: string;
  name: string;
  level: string; // e.g. "L2认证导师", "L3认证导师", "高级认证导师"
  certNo: string;
  expiryDate: string;
  certDate: string;
  avatar: string;
  rating?: number;
  phone?: string;
  bio?: string;
  certifiedDays?: number; // e.g. 1095
}

export interface Studio {
  id: string;
  name: string;
  city: string;
  district: string;
  address: string;
  image: string;
  rating: number;
  contact: string;
  tags: string[];
  description: string;
}

export interface CertApplication {
  id: string;
  name: string;
  idNumber: string;
  specialization: string; // "流瑜伽" | "阴瑜伽" | "哈他瑜伽" | "阿斯汤加"
  avatarUrl?: string;
  certUrl?: string; // training certificate file
  idCardUrl?: string;
  status: "pending" | "approved" | "rejected" | "none";
  step: number; // 1: Info, 2: Upload, 3: Success info
  submittedAt?: string;
}
