import fs from 'fs';
import path from 'path';
import { parse } from 'babylon';
import traverse from '@babel/traverse';
import { transformFromAst } from 'babel-core';
import { Ferahpack } from './ferah';
import chalk from 'chalk';
let ID = 0;

const createAsset = (filePath: string) => {
  const content = fs.readFileSync(
    filePath.split('.').includes('ts')
      ? filePath
      : filePath.split('.').concat('ts').join('.'),
    'utf-8'
  );
  const ast = parse(content, {
    sourceType: 'module',
  }) as unknown as Node;

  const dependencies: string[] = [];
  traverse(ast as any, {
    ImportDeclaration: ({ node }) => {
      dependencies.push(node.source.value);
    },
  });

  const id = ID++;

  const { code } = transformFromAst(ast as any, undefined, {
    presets: ['env'],
  });

  return {
    id,
    filePath,
    dependencies,
    code,
  } as Ferahpack.CreateAsset;
};

const createGraph = (entry: string) => {
  const mainAsset = createAsset(entry);
  const queue = [mainAsset];

  for (const asset of queue) {
    asset.mapping = {};
    const dirname = path.dirname(asset.filePath);

    asset.dependencies.forEach((relativePath) => {
      const absolutePath = path.join(dirname, relativePath);
      const child = createAsset(absolutePath);
      asset.mapping[relativePath] = child.id;
      queue.push(child);
    });
  }
  return queue;
};

const bundle = (graph: Ferahpack.CreateAsset[]) => {
  let modules = '';
  graph.forEach((mod) => {
    modules += `${mod.id}: [function (require, module, exports) {
          ${mod.code}
      },
      ${JSON.stringify(mod.mapping)}
    ],`;
  });
  const result = `
  (function(modules) {
    function require(id) {
      const [fn, mapping] = modules[id];
      function localRequire(name) {
        return require(mapping[name]);
      }
      const module = { exports : {} };
      fn(localRequire, module, module.exports);
      return module.exports;
    }
    require(0);
  })({${modules}})
`;
  return result;
};

const graph = createGraph('../example/entry.ts');
const result = bundle(graph);

console.log(chalk.greenBright(result));
