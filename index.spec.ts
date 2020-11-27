import { pluginDidLoad } from './index'

jest.mock('fs-extra', () => ({
  readJsonSync: jest.fn(() => ({ 丹陽: 'Dan Yang' })),
}))

describe('legacy i18n polyfill', () => {
  beforeEach(() => {
    delete window.i18n
  })

  it('should creeate a polyfill on window', async () => {
    window.language = 'en-US'
    await pluginDidLoad()

    expect(window.i18n).toMatchInlineSnapshot(`
      Object {
        "resources": Object {
          "__": [Function],
          "__n": [Function],
          "fixedT": [Function],
          "setLocale": [Function],
        },
        "translator": Object {
          "__": [Function],
          "__n": [Function],
          "fixedT": [Function],
          "setLocale": [Function],
        },
      }
    `)

    expect(window.i18n?.resources?.__?.('丹陽')).toMatchInlineSnapshot(`"Dan Yang"`)
    expect(window.i18n?.resources?.__?.('雪風')).toMatchInlineSnapshot(`"雪風"`)
    expect(window.i18n?.resources).toBe(window.i18n?.translator)
  })

  it('should not initialize with main window', async () => {
    window.isMain = true
    await pluginDidLoad()

    expect(window.i18n).toMatchInlineSnapshot(`undefined`)
  })
})
