import requests
from bs4 import BeautifulSoup
import re
from collections import (defaultdict, OrderedDict)
import json
import io

# Formula for valid quest id
valid_id = re.compile('[0-9]+')
split_name = re.compile('([-A-Za-z 0-9]+)')

def td_has_colspan(tag):
    return tag.name == 'td' and 'colspan' in tag.attrs and tag.find('a') and tag.find('p')

def extract_text(tag):
    en = ''
    jp = ''
    a = tag.find('a')
    if a:
        en = a.text
        p = tag.find('p')
        jp = p.contents[0] if isinstance(p.contents[0], str) else ''
    return jp, en

def fetch():
    # Get HTML page
    rsp = requests.get('http://kancolle.wikia.com/wiki/Enemy_vessel')
    soup = BeautifulSoup(rsp.text, "html.parser")

    # Get all tds
    tags = soup.find_all(td_has_colspan)

    # ID, prereq
    info = sorted([extract_text(tag) for tag in tags])
    # print(info)
    damaged_info = [('{}-壊'.format(jp_name), '{} - Damaged'.format(en_name)) for jp_name, en_name in info if jp_name != '']
    name_table = OrderedDict([(jp_name.strip(), en_name.strip()) for jp_name, en_name in info + damaged_info if jp_name != ''])
    return name_table


shipname_table = fetch()
print(shipname_table)
with open('en-US.json', 'w', encoding='utf8') as json_file:
    json.dump(shipname_table, json_file, indent=2, ensure_ascii=False)
