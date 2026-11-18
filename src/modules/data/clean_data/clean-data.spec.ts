import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import * as XLSX from 'xlsx';
import { CleanDataModule, createCleanDataService } from './clean-data.module';
import { guessDoi, parseFileName } from './lib/doi';
import { parseMention, splitMentions } from './lib/mention';
import { parseNumeric } from './lib/numeric';
import { parsePerovskite } from './lib/perovskite';
import { parsePropertyName, splitRemarks } from './lib/property-name';
import { parseSolvent } from './lib/solvent';
import { cleanText } from './lib/text';

describe('clean_data parsers', () => {
  it('normalizes text', () => {
    expect(cleanText('  NiOx \r\n NPs ')).toBe('NiOx NPs');
    expect(cleanText('mA cm−2')).toBe('mA cm-2');
    expect(cleanText('µL')).toBe('μL');
    expect(cleanText('NaN')).toBeNull();
  });

  it('parses numeric cells', () => {
    expect(parseNumeric('400-450')).toMatchObject({
      value: 425,
      value_min: 400,
      value_max: 450,
    });
    expect(parseNumeric('30 ± 5')).toMatchObject({
      value: 30,
      value_min: 25,
      value_max: 35,
      error: 5,
    });
    expect(parseNumeric('< 20')).toMatchObject({ value: 20, qualifier: 'lt' });
    expect(parseNumeric('≥99.5')).toMatchObject({
      value: 99.5,
      qualifier: 'ge',
    });
    expect(parseNumeric('> 1300')).toMatchObject({
      value: 1300,
      qualifier: 'gt',
    });
    expect(parseNumeric('< 4×10⁻⁶')).toMatchObject({
      value: 4e-6,
      qualifier: 'lt',
    });
    expect(parseNumeric('1.24E+16').value).toBe(1.24e16);
    expect(parseNumeric('1E-5').value).toBe(1e-5);
    expect(parseNumeric('-10').value).toBe(-10);
    expect(parseNumeric('RT', { roomTemperature: true })).toMatchObject({
      value: 25,
      qualifier: 'approx',
    });
    expect(parseNumeric('400 Å')).toMatchObject({ value: 400, rest: 'Å' });
    expect(parseNumeric('1o')).toMatchObject({ value: 1, rest: 'o' });
  });

  it('reads doi and sample from the file name', () => {
    expect(parseFileName('10_1002_solr_202400534_Sample1.xlsx')).toMatchObject({
      file_prefix: '10_1002_solr_202400534',
      sample_no: 1,
      doi_guess: '10.1002/solr.202400534',
    });
    expect(guessDoi('10.1002_solr.202400534')).toBe('10.1002/solr.202400534');
    expect(guessDoi('10.1016j.nanoen.2021.106285')).toBe(
      '10.1016/j.nanoen.2021.106285',
    );
    expect(guessDoi('10_31635_ccschem_025_202505977')).toBe(
      '10.31635/ccschem.025.202505977',
    );
  });

  it('parses perovskite formulas into site fractions', () => {
    const c = parsePerovskite('Cs0.05(MA0.15FA0.85)0.95Pb(I0.85Br0.15)3')!;
    const get = (ion: string) => c.find((x) => x.ion === ion)?.fraction;
    expect(get('Cs')).toBe(0.05);
    expect(get('MA')).toBe(0.1425);
    expect(get('FA')).toBe(0.8075);
    expect(get('Pb')).toBe(1);
    expect(get('I')).toBe(2.55);
    expect(
      parsePerovskite('[ (Cs.05FA.79MA.16)Pb(I.87Br.13)3 ]'),
    ).not.toBeNull();
    expect(parsePerovskite('PbI2')).toBeNull();
    expect(parsePerovskite('NiOx')).toBeNull();
  });

  it('parses solvent systems', () => {
    const a = parseSolvent('DMF/DMSO (4/1 V/V)').system!;
    expect(a.basis).toBe('v/v');
    expect(a.components.map((c) => c.fraction)).toEqual([0.8, 0.2]);
    const b = parseSolvent('DMSO:DMF (1:4 v/v)').system!;
    expect(b.components.map((c) => [c.raw, c.fraction])).toEqual([
      ['DMSO', 0.2],
      ['DMF', 0.8],
    ]);
    expect(parseSolvent('DMF/DMSO (800/200 µL)').system!.basis).toBe('v/v');
    expect(parseSolvent('DCB (anhydrous)').system!.notes).toEqual([
      'anhydrous',
    ]);
    expect(parseSolvent('DMFDMSO (3.08/1 v/v)').problem).not.toBeNull();
  });

  it('parses material mentions', () => {
    expect(parseMention('NiOx NPs')).toMatchObject({
      name: 'NiOx',
      form: 'NP',
    });
    expect(parseMention('Li:NiOx (2%)')).toMatchObject({
      name: 'Li:NiOx',
      notes: ['2%'],
    });
    expect(parseMention('Zr(acac)4').name).toBe('Zr(acac)4');
    expect(
      parseMention('Nickel(II) nitrate hexahydrate (Ni(NO3)2·6H2O)'),
    ).toMatchObject({
      name: 'Nickel(II) nitrate hexahydrate',
      notes: ['Ni(NO3)2·6H2O'],
    });
    const none = () => false;
    expect(splitMentions('LiF / C60 / BCP', none).map((m) => m.name)).toEqual([
      'LiF',
      'C60',
      'BCP',
    ]);
    expect(splitMentions('CsI 5 mg/mL', none).map((m) => m.name)).toEqual([
      'CsI',
    ]);
    expect(splitMentions('Cs/FA/MA', (s) => s === 'Cs/FA/MA')).toHaveLength(1);
  });

  it('splits property names into property / statistic / scan', () => {
    expect(parsePropertyName('Champion PCE (RS)')).toMatchObject({
      name: 'PCE',
      statistic: 'champion',
      scan: 'RS',
    });
    expect(parsePropertyName('Average  Jsc')).toMatchObject({
      name: 'Jsc',
      statistic: 'average',
      scan: 'NA',
    });
    expect(parsePropertyName('AverageVoc')).toMatchObject({
      name: 'Voc',
      statistic: 'average',
    });
    expect(parsePropertyName('Rs')).toMatchObject({ name: 'Rs', scan: 'NA' });
    expect(parsePropertyName('VBM (NiOx)')).toMatchObject({
      name: 'VBM',
      context: ['NiOx'],
    });
    expect(splitRemarks('Figure 4b')).toEqual({
      source_ref: 'Fig. 4b',
      remarks: null,
    });
  });
});

describe('clean_data pipeline', () => {
  const service = createCleanDataService();

  const workbook = (sheets: Record<string, unknown[][]>): Buffer => {
    const wb = XLSX.utils.book_new();
    for (const [name, rows] of Object.entries(sheets)) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), name);
    }
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  };

  const device = (process: unknown[][]) =>
    workbook({
      Layer: [
        ['LayerID', 'LayerType', 'Material', 'Thickness (nm)'],
        [1, 'Anode', 'ITO', null],
        [2, 'HTL', 'NiOx NPs', 20],
        [3, 'PSK', 'Cs0.05FA0.85MA0.1PbI3', '400-450'],
        [4, 'ETL', 'C60', 20],
        [5, 'Cathode', 'Ag', 100],
      ],
      Vender: [
        ['Material', '%Purity', 'Vender'],
        ['PbI2', '99.99', 'Sigma Aldrich'],
      ],
      Materials: [
        ['LayerID', 'Material', 'Type', 'Solvent', 'Amount', 'Unit'],
        [3, 'PbI2', 'Precursor', 'DMSO:DMF (1:4 v/v)', 1.5, 'M'],
      ],
      Process: [
        [
          'LayerID',
          'StepOrder',
          'ProcessType',
          'Descriptions',
          'Parameter',
          'Unit',
        ],
        ...process,
      ],
      Properties: [
        ['Properties', 'Values', 'Errors', 'Unit', 'Remarks'],
        ['Champion PCE (RS)', 20.1, null, '%', 'Table 1'],
        ['Champion Voc (RS)', 1.1, null, 'V', null],
        ['Champion Jsc (RS)', 23, null, 'mA cm-2', null],
        ['Champion FF (RS)', 79.4, null, '%', null],
      ],
      Stability: [
        [
          'Environment',
          'Encapsulation',
          'Temperature (°C)',
          'Humidity (%)',
          'Time (hr)',
          'Retention (%)',
        ],
        [
          'MPP tracking, 1 Sun, ambient air (ISOS-L-2)',
          'N',
          'RT',
          '30 ± 5',
          1000,
          '>80',
        ],
      ],
    });

  it('cleans a valid file into gold JSON', () => {
    const r = service.runFile({
      fileName: '10_1002_solr_202400534_Sample1.xlsx',
      buffer: device([
        [3, 1, 'SpinCoating', null, '4000, 30', 'RPM, sec'],
        [3, 2, 'Annealing', null, '100, 10', ' C, min'],
      ]),
    });

    expect(r.status).toBe('passed');
    expect(r.quarantine).toBeNull();
    const g = r.clean!;
    expect(g.paper.doi).toBe('10.1002/solr.202400534');
    expect(g.sample.architecture).toBe('pin');
    expect(g.layers.find((l) => l.role === 'psk')).toMatchObject({
      thickness_nm: 425,
      thickness_min_nm: 400,
      thickness_max_nm: 450,
    });
    expect(g.process_steps[1].params).toMatchObject([
      { param: 'temperature', value: 100, unit: '°C' },
      { param: 'duration', value: 600, unit: 's' },
    ]);
    expect(g.layer_ingredients[0]).toMatchObject({
      material: 'PbI2',
      role: 'precursor',
      solvent_system: { label: 'DMF 0.80 + DMSO 0.20 (v/v)' },
    });
    expect(g.material_sources[0]).toMatchObject({
      vendor: 'Sigma-Aldrich',
      purity_pct: 99.99,
    });
    expect(g.stability_tests[0]).toMatchObject({
      atmosphere: 'air',
      light: '1-sun',
      mode: 'MPPT',
      isos_code: 'ISOS-L-2',
      encapsulated: false,
      rh_pct_min: 25,
      retention_pct_qualifier: 'gt',
    });
    expect(g.v_device_summary).toMatchObject({
      pce_champion: 20.1,
      psk: 'Cs0.05FA0.85MA0.1PbI3',
    });
  });

  it('quarantines rows that fail and reports them', () => {
    const r = service.runFile({
      fileName: '10_1002_solr_202400534_Sample1.xlsx',
      buffer: device([
        [3, 1, 'SpinCoating', null, 4000, 'RPM, sec'],
        [3, 2, 'Teleport', null, '100', 'C'],
        [9, 1, 'Annealing', null, '100', 'C'],
      ]),
    });

    expect(r.status).toBe('partial');
    const rules = r.quarantine!.errors.map((e) => e.rule).sort();
    expect(rules).toEqual([
      'fk_layer_missing',
      'param_unit_mismatch',
      'process_type_unmapped',
    ]);
    expect(r.quarantine!.rows.map((q) => q.lineage.source_row)).toEqual([
      2, 3, 4,
    ]);
    expect(r.clean!.process_steps).toHaveLength(0);
    expect(r.clean!.layers).toHaveLength(5);
  });

  it('stops after a given step and resumes from its JSON', () => {
    const input = {
      fileName: '10_1002_solr_202400534_Sample1.xlsx',
      buffer: device([]),
    };
    const partial = service.runFile(input, { until: 'standardize' });
    expect(partial.stopped_at).toBe('standardize');

    const state = JSON.parse(JSON.stringify(partial.state));
    const resolved = service.runStep('resolve', state);
    expect(resolved.step).toBe('resolve');
    expect(() => service.runStep('load', resolved)).toThrow();
  });

  it('skips a duplicate upload and flags conflicting samples', () => {
    const a = device([]);
    const b = device([[3, 1, 'SpinCoating', null, '4000, 30', 'RPM, sec']]);
    const { results } = service.runBatch([
      { fileName: '10_1002_solr_202400534_Sample1.xlsx', buffer: a },
      { fileName: '10_1002_solr_202400534_Sample1.xlsx', buffer: a },
      { fileName: '10.1002_solr.202400534_Sample1.xlsx', buffer: b },
    ]);
    expect(results.map((r) => r.status)).toEqual([
      'passed',
      'duplicate',
      'failed',
    ]);
    expect(results[2].quarantine!.errors[0].rule).toBe('sample_key_conflict');
  });

  describe('HTTP', () => {
    let app: INestApplication;

    beforeAll(async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [CleanDataModule],
      }).compile();
      app = moduleRef.createNestApplication();
      await app.init();
    });
    afterAll(() => app.close());

    it('POST /clean-data/run cleans uploaded files and /steps/:step continues a run', async () => {
      const buffer = device([
        [3, 1, 'SpinCoating', null, '4000, 30', 'RPM, sec'],
      ]);
      const run = await request(app.getHttpServer())
        .post('/clean-data/run')
        .attach('files', buffer, '10_1002_solr_202400534_Sample1.xlsx')
        .expect(201);
      expect(run.body.data.results[0].status).toBe('passed');

      const partial = await request(app.getHttpServer())
        .post('/clean-data/run?until=validate')
        .attach('files', buffer, '10_1002_solr_202400534_Sample1.xlsx')
        .expect(201);
      const state = partial.body.data.results[0].state;
      expect(state.step).toBe('validate');

      const loaded = await request(app.getHttpServer())
        .post('/clean-data/steps/load')
        .send(state)
        .expect(201);
      expect(loaded.body.data.data.gold.paper.doi).toBe(
        '10.1002/solr.202400534',
      );

      await request(app.getHttpServer())
        .post('/clean-data/steps/resolve')
        .send(state)
        .expect(400);
      await request(app.getHttpServer()).post('/clean-data/run').expect(400);
    });
  });
});
