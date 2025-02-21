from urllib.request import urlopen
import re, json
import sched, time

# Sets a year+dayOfYear integer at every successful update
updatedStores = {
  "Willys": 0
}

s = sched.scheduler(time.time, time.sleep)

getTodayAsInt = lambda : int(time.strftime("%Y%j", time.gmtime()))
isMonday = lambda : int(time.strftime("%u")) == 1
needsUpdate = lambda storeName : getTodayAsInt() != updatedStores[storeName]

# Run a method only once during a Monday
def onlyOnMondays(storeName, callback):
  if isMonday() & needsUpdate(storeName):
    callback()

  runSchedulerService()

# Opens, writes and closes a json file
def storeWillysDiscountAPIUrl():
  parameter = getWillysDiscountParameter()

  apiUrl = f'https://www.willys.se/productBannerComponent/{parameter}?size=999'
  filename = 'stores.json'

  with open(filename, 'r+') as storesFile:
    storeDict = json.load(storesFile)

    for store in storeDict['store_items']:
      if store['name'] == "Willys":
        if store['parameter'] != parameter:
          store['url'] = apiUrl
        else:
          return

    jsonDict = json.dumps(storeDict, indent=4)

    # Overwrite the file
    storesFile.seek(0)
    storesFile.write(jsonDict)
    storesFile.truncate()

    storesFile.close()

    print("👍 Updated Willys api url")

    updatedStores['Willys'] = getTodayAsInt()

# Parsing the Willy's homepage for the parameter containing discounts
def getWillysDiscountParameter():
  discountKeyword = '\"Veckans varor\"'[::-1] # reversing
  parameterKeyword = '\"uid\"'[::-1]  # reversing
  regexpDiscount = f'{discountKeyword}.+?{parameterKeyword}' # greedy
  regexpParameter = 'comp_\w+'
  url = 'https://www.willys.se'

  #return 'comp_0000M17T'

  with urlopen(url) as response:
    html = response.read().decode('utf-8')
  
    matchDiscount = re.search(regexpDiscount, html[::-1]) # reversed

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

def runSchedulerService():
  every_hour = 3600
  s.enter(every_hour, 2, onlyOnMondays, argument=("Willys", storeWillysDiscountAPIUrl))
  s.run()
  
runSchedulerService()