import aiModelsData from "../../../specs/data/ai-models.json";

export interface AiModelData {
	id: string;
	locPerSec: number;
	flopsCost: number;
}

export const aiModels: AiModelData[] = aiModelsData.models as AiModelData[];
