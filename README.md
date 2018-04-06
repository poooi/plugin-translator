[![npm package][npm-badge]][npm]

# Poi-Plugin-Translate
Translate ships and items in game into English.

## Data
English translation data make use of [Kantai Collection English Wikia](http://kancolle.wikia.com/)'s content under CC-BY-SA license.

## Updating (notes for dev)
Currently, ships and items could be automatically updated. Others are manually maintained.

The `update.sh` is the script to perform an update. It will crawl the Wikia pages and extract data from them. Python, `requests` and `beautifulsoup4` is required. Following instructions are recommended if you're not familiar with Python:

- Make sure python > 3.3 is installed

- under the project root folder, initiate python `venv`
    ```shell
    python3 -m venv ./venv
    ```

- Activate the `venv` created
    ```shell
    source ./venv/bin/activate
    ```

- Install requirements
    ```shell
    pip install -r requirements.txt
    ```

- done, run your update
    ```
    ./update.sh
    ```

[npm-badge]: https://img.shields.io/npm/v/poi-plugin-translator.svg?style=flat-square
[npm]: https://www.npmjs.org/package/poi-plugin-translator
