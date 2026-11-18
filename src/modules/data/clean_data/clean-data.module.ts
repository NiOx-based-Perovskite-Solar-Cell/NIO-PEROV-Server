// clean-data.module.ts
import { Module } from '@nestjs/common';
import { CleanDataController } from './clean-data.controller';
import { CleanDataService } from './clean-data.service';
import { DictionaryService } from './dictionary/dictionary.service';
import { IngestStep } from './steps/01-ingest.step';
import { StructureStep } from './steps/02-structure.step';
import { StandardizeStep } from './steps/03-standardize.step';
import { ResolveStep } from './steps/04-resolve.step';
import { ValidateStep } from './steps/05-validate.step';
import { LoadStep } from './steps/06-load.step';

@Module({
  controllers: [CleanDataController],
  providers: [
    DictionaryService,
    IngestStep,
    StructureStep,
    StandardizeStep,
    ResolveStep,
    ValidateStep,
    LoadStep,
    CleanDataService,
  ],
  exports: [CleanDataService],
})
export class CleanDataModule {}

// Build the pipeline without Nest DI (used by the CLI script)
export function createCleanDataService(): CleanDataService {
  const dict = new DictionaryService();
  return new CleanDataService(
    new IngestStep(dict),
    new StructureStep(dict),
    new StandardizeStep(dict),
    new ResolveStep(dict),
    new ValidateStep(dict),
    new LoadStep(dict),
  );
}
