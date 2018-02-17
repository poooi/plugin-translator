cd ./i18n_source/ship/
python3 fetch.py

cd ../slotitem
python3 fetch.py

cd ../ship-abyssal
python3 fetch.py

cd ../slotitem-abyssal
python3 fetch.py

cd ../../
node pack.js
