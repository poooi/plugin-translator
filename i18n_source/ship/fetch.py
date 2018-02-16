import requests
from bs4 import BeautifulSoup
import re
from collections import (defaultdict, OrderedDict)
import json
import io

def is_valid_table(t):
    g=t.findNext('th')
    return g and g.text.upper().strip() == 'NO.'

# Parses a table into list of lists, especially parses colspan and rowspan
# From http://stackoverflow.com/questions/9978445/parsing-a-table-with-rowspan-and-colspan
def table_to_list(table):
    def table_to_2d_dict(table):
        result = defaultdict(lambda : defaultdict(str))
        for row_i, row in enumerate(table.findAll('tr')):
            for col_i, col in enumerate(row.findAll(['td', 'th'])):
                colspan = int(col.get('colspan', 1))
                rowspan = int(col.get('rowspan', 1))
                col_data = col
                while row_i in result and col_i in result[row_i]:
                    col_i += 1
                for i in range(row_i, row_i + rowspan):
                    for j in range(col_i, col_i + colspan):
                        result[i][j] = col_data
        return result


    def iter_2d_dict(dct):
        for i, row in sorted(dct.items()):
            cols = []
            for j, col in sorted(row.items()):
                cols.append(col)
            yield cols
    dct = table_to_2d_dict(table)

    return list(iter_2d_dict(dct))

# Formula for valid quest id
valid_id = re.compile('[0-9]+')


def getWikiQuestInfo():
    # Get HTML page
    rsp = requests.get('http://kancolle.wikia.com/wiki/Ship_list')
    soup = BeautifulSoup(rsp.text, "html.parser")

    # Get all quest tables
    tables = [t for t in soup.findAll('table') if is_valid_table(t)]

    # Eliminate headers
    rows = [row for table in tables for row in table_to_list(table) if valid_id.match(row[0].text)]

    # ID, prereq
    info = sorted([(int(row[0].text), list(row[1].strings)[0:2]) for row in rows])
    name_table = OrderedDict([(jp_name.strip(), en_name.strip()) for (_, [en_name, jp_name]) in info if jp_name.strip()])
    return name_table


shipname_table = getWikiQuestInfo()
print(shipname_table)
with open('en-US.json', 'w', encoding='utf8') as json_file:
    json.dump(shipname_table, json_file, indent=2, ensure_ascii=False)
