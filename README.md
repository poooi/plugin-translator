# plugin-translate
Translate package into English.

## Data
English translation data make use of [Kantai Collection English Wikia](http://kancolle.wikia.com/)'s content under CC-BY-SA license.

## Updating date (notes for dev)
The `update.sh` is a script to execute the update. Python, `requests` and `beautifulsoup4` is required. Following instructions are recommended if you're not familiar with python:

- Make sure python > 3.3 is intalled

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
