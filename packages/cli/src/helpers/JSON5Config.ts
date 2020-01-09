import * as fs from 'fs-extra'
import { FabConfig, a_sume, s_sume } from '@fab/core'
import * as jju from 'jju'
import regexParser from 'regex-parser'
import { MissingConfig, InvalidConfigError } from '../errors'
import prettier from 'prettier'

export default class JSON5Config {
  str_contents: string
  data: FabConfig

  static async readFrom(file_path: string): Promise<JSON5Config> {
    if (!(await fs.pathExists(file_path))) {
      throw new MissingConfig(file_path)
    }

    const str_contents = await a_sume(
      () => fs.readFile(file_path, 'utf8'),
      () => new InvalidConfigError(`Could not read file at '${file_path}'`)
    )

    const data = s_sume(
      () => jju.parse(str_contents),
      () =>
        new InvalidConfigError(
          `Could not parse file at '${file_path}'. Check that it is valid JSON5.`
        )
    )

    return new JSON5Config(str_contents, data)
  }

  static generate(data: FabConfig) {
    return new JSON5Config(
      prettier.format(jju.stringify(data), { parser: 'json-stringify' }),
      data
    )
  }

  constructor(str_contents: string, data: FabConfig) {
    // todo: can we generate a validator from the TS definition
    if (!data.build) {
      throw new InvalidConfigError(`The FAB config file is missing a 'build' property.`)
    }

    for (const [plugin, args] of Object.entries(data.build)) {
      for (const [k, v] of Object.entries(args)) {
        if (typeof v === 'string' && v.match(/^\/.*\/([gimy]*)$/)) {
          args[k] = regexParser(v as string)
        }
      }
    }

    this.str_contents = str_contents
    this.data = data
  }

  async write(file_path: string) {
    await fs.writeFile(
      file_path,
      prettier.format(jju.update(this.str_contents, this.data), {
        parser: 'json-stringify',
      })
    )
  }
}
