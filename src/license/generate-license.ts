import fs from 'node:fs';
import {randomUUID, webcrypto} from 'node:crypto';
import {program, Option} from 'commander';
import clc from 'cli-color';
import {LicenseType, generateLicense} from './license.js';

interface Options {
  privateKeyFile: string;
  licenseFile: string;
  type: LicenseType;
  name: string;
  domain: string[];
}

async function main(options: Options): Promise<void> {
  // import private key
  const privateKeyJwk: JsonWebKey = JSON.parse(fs.readFileSync(options.privateKeyFile, { encoding: 'utf-8' }));
  console.log(`Imported private key from ${options.privateKeyFile}:`);
  console.log(clc.blackBright(JSON.stringify(privateKeyJwk, undefined, 2)));
  console.log();

  // generate license
  const id = randomUUID();
  const created = new Date().toISOString();
  const license = await generateLicense(webcrypto as Crypto, privateKeyJwk, id, options.type, options.name, options.domain, created);
  
  // export license
  fs.writeFileSync(options.licenseFile, JSON.stringify(license, undefined, 2));
  console.log(`Exported license to ${options.licenseFile}:`);
  console.log(clc.blackBright(JSON.stringify(license, undefined, 2)));
  console.log();
}

program
  .addOption(new Option('--privateKeyFile <private-key-file>').env('LICENSE_PRIVATE_KEY_FILE'))
  .addOption(new Option('--licenseFile <license-file>').env('LICENSE_FILE'))
  .addOption(new Option('--type <type>').choices(Object.values(LicenseType)).makeOptionMandatory())
  .addOption(new Option('--name <name>').makeOptionMandatory())
  .addOption(new Option('--domain <domain>').default([]).argParser<string[]>((curr, prev) => prev.concat([curr])))
program.parse();
main(program.opts());