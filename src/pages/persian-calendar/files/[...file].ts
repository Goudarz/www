// /persian-calendar/files/…: downloads served from this domain, built from the repository at build time.
//   data/<file>                   reference data (CSV, TXT, JSON)
//   implementations/<lang>/<file> one source file
//   persian-calendar-<lang>.zip   one implementation with the data its tests read, in the repository layout
//   persian-calendar-data.zip     all reference data
//   persian-calendar-<version>.zip the whole repository
import type { APIRoute } from 'astro';
import { DATA_ZIP, zipName } from '../../../persian-calendar/content';
import { implementations } from '../../../persian-calendar/implementations';
import { commitDate, readRepoBytes, repoFiles, version } from '../../../persian-calendar/repo';
import { createZip } from '../../../persian-calendar/zip';

const TYPES: Record<string, string> = {
  csv: 'text/csv; charset=utf-8',
  json: 'application/json; charset=utf-8',
  zip: 'application/zip',
};

const archive = (folder: string, files: string[]) =>
  createZip(
    files.map((file) => ({ name: `${folder}/${file}`, data: readRepoBytes(file), executable: file.endsWith('.sh') })),
    commitDate,
  );

const dataFiles = repoFiles.filter((file) => file.startsWith('data/'));

export function getStaticPaths() {
  const single = repoFiles
    .filter((file) => file.startsWith('data/') || file.startsWith('implementations/'))
    .map((file) => ({ params: { file }, props: { kind: 'file' as const, files: [file] } }));

  const perLanguage = implementations.map((impl) => ({
    params: { file: zipName(impl) },
    props: {
      kind: 'zip' as const,
      folder: zipName(impl).replace(/\.zip$/, ''),
      files: ['LICENSE', 'implementations/README.md', ...impl.files, ...dataFiles],
    },
  }));

  return [
    ...single,
    ...perLanguage,
    { params: { file: DATA_ZIP }, props: { kind: 'zip' as const, folder: 'persian-calendar-data', files: dataFiles } },
    {
      params: { file: zipName() },
      props: {
        kind: 'zip' as const,
        folder: `persian-calendar-${version}`,
        // Everything except the social preview images, which only matter on GitHub
        files: repoFiles.filter((file) => !file.startsWith('social-preview/')),
      },
    },
  ];
}

export const GET: APIRoute = ({ props, params }) => {
  const name = String(params.file);
  const body = props.kind === 'zip' ? archive(props.folder, props.files) : readRepoBytes(props.files[0]);
  const type = TYPES[name.split('.').pop() ?? ''] ?? 'text/plain; charset=utf-8';
  return new Response(new Uint8Array(body), { headers: { 'Content-Type': type } });
};
