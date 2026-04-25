export interface GenerateGiftPayload {
  recipientName: string;
  occasion: string;
  personalMessage: string;
  tone: string;
  themeName: string;
  themeDirection: string;
  templateLabel: string;
  templateBlueprint: string;
  variationLabel: string;
  variationBlueprint: string;
  variationDescription: string;
}

export interface GiftRecord {
  giftId: string;
  userId: string;
  recipientName: string;
  occasion: string;
  s3Key: string;
  createdAt: string;
}

export interface GenerateGiftResponse {
  giftId: string;
}

export interface GetGiftResponse {
  html: string;
}
