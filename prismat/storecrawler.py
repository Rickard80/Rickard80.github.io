from urllib.request import urlopen
import re, json
import time#, sched

getTodayAsInt = lambda : int(time.strftime("%Y%j", time.gmtime()))
alreadyUpdated = lambda lastUpdated : getTodayAsInt() == lastUpdated

# Opens, writes and closes a json file
def storeWillysDiscountAPIUrl():
  filename = 'prismat/stores.json'

  with open(filename, 'r+') as storesFile:
    storeDict = json.load(storesFile)

    for store in storeDict['store_items']:
      if store['name'] == "Willys":
        if alreadyUpdated(store['last_updated']):
          print(f"API already updated today: {store['last_updated']}")
          return

        # API call
        parameter = getWillysDiscountParameter()
        apiUrl = f'https://www.willys.se/productBannerComponent/{parameter}?size=999'

        print("Parameter", parameter)

        if parameter == None:
          return
        if store['parameter'] == parameter:
          print(f"Same as stored url: {parameter}")
          return
        else:
          store['url'] = apiUrl
          store['parameter'] = parameter
          store['last_updated'] = getTodayAsInt()

    jsonDict = json.dumps(storeDict, indent=4)

    # Overwrite the file
    storesFile.seek(0)
    storesFile.write(jsonDict)
    storesFile.truncate()

    storesFile.close()

    print("👍 Updated Willys api url")

# Parsing the Willy's homepage for the parameter containing discounts
def getWillysDiscountParameter():

  discountKeyword = 'Veckans varor'[::-1] # reversing
  parameterKeyword = '"uid'[::-1]  # reversing
  regexpDiscount = f'{discountKeyword}.+?{parameterKeyword}' # greedy
  regexpParameter = 'comp_\\w+'
  url = 'https://www.willys.se/axfoodcommercewebservices/v2/willys/cms/pages?pageLabelOrId=homePage'

  with urlopen(url) as response:
    json = response.read().decode('utf-8')
  
    matchDiscount = re.search(regexpDiscount, json[::-1], re.DOTALL) # reversed

    print(regexpDiscount, ':', matchDiscount.group()[::-1])

    if matchDiscount:
      matchParameter = re.search(regexpParameter, matchDiscount.group()[::-1]) # forward

      if matchParameter:
        discountParameter = matchParameter.group()
        print(f'getWillysDiscountParameter: Found parameter: {discountParameter}')

        return discountParameter
      else:
        print("getWillysDiscountParameter: Couldn't match PARAMETER")
    else:
      print("getWillysDiscountParameter: Couldn't match DISCOUNT")

storeWillysDiscountAPIUrl()