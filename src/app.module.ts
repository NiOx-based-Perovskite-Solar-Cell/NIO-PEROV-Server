import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { MinioModule } from './modules/minio/minio.module';
import { RawDataModule } from './modules/data/raw_data/raw-data.module';
import { CleanDataModule } from './modules/data/clean_data/clean-data.module';
import { UnitModule } from './modules/unit/unit.module';
import { PropertyModule } from './modules/property/property.module';
import { ProcessTypeModule } from './modules/process-type/process-type.module';
import { MaterialModule } from './modules/material/material.module';
import { PerovskiteCompositionModule } from './modules/perovskite-composition/perovskite-composition.module';
import { VendorModule } from './modules/vendor/vendor.module';
import { MaterialSourceModule } from './modules/material-source/material-source.module';
import { SolventSystemModule } from './modules/solvent-system/solvent-system.module';
import { SolventComponentModule } from './modules/solvent-component/solvent-component.module';
import { PaperModule } from './modules/paper/paper.module';
import { SampleModule } from './modules/sample/sample.module';
import { LayerModule } from './modules/layer/layer.module';
import { ProcessStepModule } from './modules/process-step/process-step.module';
import { ProcessParamModule } from './modules/process-param/process-param.module';
import { LayerIngredientModule } from './modules/layer-ingredient/layer-ingredient.module';
import { MeasurementModule } from './modules/measurement/measurement.module';
import { StabilityTestModule } from './modules/stability-test/stability-test.module';
import { DeviceModule } from './modules/aggregate/device/device.module';
import { MaterialDetailModule } from './modules/aggregate/material-detail/material-detail.module';
import { SolventSystemDetailModule } from './modules/aggregate/solvent-system-detail/solvent-system-detail.module';
import { PaperDetailModule } from './modules/aggregate/paper-detail/paper-detail.module';
import { LoggerModule } from './common/logger/logger.module';
import { RedisModule } from './common/redis/redis.module';
import { JwtModule } from '@nestjs/jwt';
import { AuthMiddleware } from './common/middleware/auth.middleware';
import { NestModule, MiddlewareConsumer } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AccessGuard } from './common/guard/access.guard';
import { RequestMethod } from '@nestjs/common';
import { types as pgTypes } from 'pg';

// NUMERIC (oid 1700) -> JS number instead of string, for both repository and
// raw dataSource.query() results. int8 ids stay strings (no precision loss)
pgTypes.setTypeParser(1700, (value: string) => parseFloat(value));

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.PG_HOST,
      port: parseInt(String(process.env.PG_PORT), 10),
      username: process.env.PG_USER,
      password: process.env.PG_PASSWORD,
      database: process.env.PG_DATABASE,
      autoLoadEntities: true,
      synchronize: false, // True เฉพาะ Dev Mode (สร้าง Table อัตโนมัติ)
      // PG_SSL=false สำหรับ local Postgres ใน Docker ที่ไม่รองรับ SSL
      ssl: process.env.PG_SSL === 'false' ? false : true,
      extra:
        process.env.PG_SSL === 'false'
          ? {}
          : {
              ssl: {
                rejectUnauthorized: false,
              },
            },
    }),
    AuthModule,
    UsersModule,
    MinioModule,
    RawDataModule,
    CleanDataModule,
    // per-table modules
    UnitModule,
    PropertyModule,
    ProcessTypeModule,
    MaterialModule,
    PerovskiteCompositionModule,
    VendorModule,
    MaterialSourceModule,
    SolventSystemModule,
    SolventComponentModule,
    PaperModule,
    SampleModule,
    LayerModule,
    ProcessStepModule,
    ProcessParamModule,
    LayerIngredientModule,
    MeasurementModule,
    StabilityTestModule,
    // aggregate modules (several tables at once)
    DeviceModule,
    MaterialDetailModule,
    SolventSystemDetailModule,
    PaperDetailModule,
    LoggerModule,
    RedisModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
    }),
  ],

  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: AccessGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuthMiddleware)
      .exclude(
        { path: 'health', method: RequestMethod.ALL },
        { path: 'auth/google', method: RequestMethod.ALL },
        { path: 'auth/google/callback', method: RequestMethod.ALL },
      );
    // .forRoutes('*');
  }
}
