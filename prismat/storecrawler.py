from urllib.request import urlopen
import re
import json


def storeWillysDiscountAPIUrl():
  parameter = getWillysDiscountParameter()
  apiUrl = f'https://www.willys.se/productBannerComponent/{parameter}?size=999'
  filename = 'stores.json'

  with open(filename, 'r+') as storesFile:
    storeDict = json.load(storesFile)

    for store in storeDict['store_items']:
      if store['name'] == "Willys":
        store['url'] = apiUrl

    jsonDict = json.dumps(storeDict, indent=4)

    # Overwrite the file
    storesFile.seek(0)
    storesFile.write(jsonDict)
    storesFile.truncate()

    storesFile.close()


def getWillysDiscountParameter():
  discountKeyword = '\"Veckans varor\"'[::-1] # reversing
  parameterKeyword = '\"uid\"'[::-1]  # reversing

  #regexpDiscount = f'{discountKeyword}.+?{parameterKeyword}' # greedy
  regexpDiscount = f'{discountKeyword}[\s\S]+?{parameterKeyword}'
  regexpParameter = 'comp_\w+'
  url = 'https://www.willys.se'

  return 'comp_0000M17T'

  with urlopen(url) as response:
    html = response.read().decode('utf-8')
  
    matchDiscount = re.search(regexpDiscount, html[::-1]) # reversed

    if matchDiscount:
      matchParameter = re.search(regexpParameter, matchDiscount.group()[::-1]) # forward

      if matchParameter:
        discountParameter = matchParameter.group()
        print(f'getWillysDiscountParameter: Found parameter: {discountParameter}')
      else:
        print("getWillysDiscountParameter: Couldn't match PARAMETER")
    else:
      print("getWillysDiscountParameter: Couldn't match DISCOUNT")

storeWillysDiscountAPIUrl()