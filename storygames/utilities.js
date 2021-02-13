const LAST_VISITED = "last-visited";
const DEFAULT_HEADLINE = "Story Games Index";
const SEARCH_HEADLINE = "Search";
const LIST_INDEX = 0;

const domainOrigin = 'https://rickard80.github.io/storygames/'
const archiveOrigin = domainOrigin + 'archive/';

let headline = DEFAULT_HEADLINE;
var currentPageIndex = 0;
var showContent = false;

var indexInput = null;
var listIndexes = null;
var lastItemInIndexes = null;
var searchResultElem = null;
var sectionsElem = null;

var googleResults = null;

function google(event) {
  let searchInput = event.currentTarget;
  let keywords = searchInput.value.trim();

  searchResultElem = searchResultElem || document.getElementById('searchResults');

  if (keywords.length > 3) {
    searchResultElem.innerHTML = `<h1>Loading...</h1>`;
    headline = SEARCH_HEADLINE;
    displaySection('searchResults');
    updateURL('searchResults', SEARCH_HEADLINE, 'search');

    let excludeIndexPage = ` -site:${domainOrigin}index.html`,
        excludeSitemap =   ` -site:${domainOrigin}sitemap.html`;

    keywords += excludeIndexPage;
    keywords += excludeSitemap;

    searchInput.placeholder = SEARCH_HEADLINE;

    googleResults = [];
    searchOnGoogle(keywords, 1);
  } else {
    searchInput.value = "";
    searchInput.placeholder = "Too short. Min 4 characters.";
  }
}

function searchOnGoogle(keywords, index) {
  const API_KEY = 'AIzaSyCQmwK7JeBoXmmPiwROOf0G0ATkwEuRy30';
  const SEARCH_ENGINE_ID = '72ea68d1161039cae';

  searchResultElem.innerHTML = '<h1>Search Results</h1>';
  searchResultElem.innerHTML += `<i id="searchInformation"></i>`;

  fetchData(`https://www.googleapis.com/customsearch/v1?key=${API_KEY}&cx=${SEARCH_ENGINE_ID}&q=${keywords}&start=${index}`, function() {
    if (this.readyState == 4 && this.status == 200 && this.responseText) {
      let response = JSON.parse(this.responseText);
      console.log('Google Search', response);
      handleSearchResults(response, index == 1);
    }
  });
}

function handleSearchResults(response, onFirstPage) {
  let totalResults = response.searchInformation.totalResults;
  let nextPage = response.queries.nextPage;

  if (nextPage && onFirstPage) {
    searchOnGoogle(nextPage[0].searchTerms, nextPage[0].startIndex);
  }

  if (totalResults > 0) {
    let cleanedArticles = removeNonArticlePages(response.items);
    googleResults = [...googleResults, ...cleanedArticles];
    let containerElem = document.createElement('div');
    let extractIndex = /\/(\d+?)\./;
    var index = 0;

    for (let result of cleanedArticles) {
      index = result.link.match(extractIndex)[1];
      containerElem.innerHTML += `<a href="?${index}" data-tooltip="${result.snippet}"><i></i><i>${result.title}</i><br/></a>`;
    }

    document.getElementById('searchInformation').innerHTML = `Displaying top ${googleResults.length} out of ${response.searchInformation.totalResults} results.`;

    searchResultElem.appendChild(containerElem);
  } else {
    searchResultElem.innerHTML += `<p>No results found.</p>`;
  }
}

function removeNonArticlePages(googleResults) {
  return googleResults.filter(result => {
    return result.link.indexOf('index.html') == -1 &&
           result.link.indexOf('sitemap') == -1;
  });
}

/* NAVIGATION */

function switchTab(event) {
  let className = event.target.classList[0],
      showList = className == 'list',
      state = (showList) ? LIST_INDEX : currentPageIndex,
      index = (showList) ? '' : currentPageIndex,
      firstTimeVisitedLoadingPage = !showList && (headline == DEFAULT_HEADLINE || headline == SEARCH_HEADLINE) && currentPageIndex;

  if (firstTimeVisitedLoadingPage) {
    loadDoc(currentPageIndex);
  } else {
    displaySection(className);
  }

  updateLocation(state, null, index);
}

function displaySection(sectionId) {
  hideAllSections();
  showContent = sectionId == 'page';
  showSearch = sectionId == 'searchResults';

  document.getElementById(sectionId).classList.remove('hidden');
  setDocumentTitle((showContent || showSearch) ? headline : DEFAULT_HEADLINE);

  if (sectionId == 'list' && currentPageIndex) {
    scrollToListItem();
  }
}

function hideAllSections() {
  for (let section of sectionsElem) {
    section.classList.toggle('hidden', true);
  }
}

function scrollToListItem() {
  const WAIT_FOR_DOM_TO_LOAD = 10;

  let id = setInterval(() => {
    if (lastItemInIndexes.clientHeight) {
      clearInterval(id);
      for (let indexEl of listIndexes) {
        if (getIndex(indexEl.textContent) == currentPageIndex) {
          indexEl.scrollIntoView();
          break;
        }
      }
    }
  }, WAIT_FOR_DOM_TO_LOAD);
}

function updateLocation(state, title, index) {
  scrollTo(0, 0);
  updateURL(state, title, index);
}

function updateURL(state, title, url, replace) {
  url = `?${url}`;

  if (replace) {
    history.replaceState(state, title, url);
  } else {
    history.pushState(state, title, url);
  }
}

function setDocumentTitle(title) {
  document.title = `SGI :: ${title}`;
}

/* LOAD DOCUMENT */

function fetchData(url, callbackFn) {
  var xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function() {
    callbackFn.apply(this);
  };
  xhttp.open("GET", url, true);
  xhttp.send();
}

let response

function loadDoc(pageIndex, increase) {
  let pageEl = document.getElementById("page");

  currentPageIndex = parseInt(pageIndex);
  indexInput.value = pageIndex;

  pageEl.innerHTML = "<h1 class='loading'>Loading...</h1>";
  displaySection('page');

  fetchData(`${archiveOrigin}${pageIndex}.html`, function() {
      if (this.readyState == 4 && this.status == 200) {
console.log('document loaded:', pageIndex);

        let responseText = this.responseText;
        responseText = cleanFromLineBreaks(responseText);
        responseText = replaceAnchorLink(responseText);
        responseText = changeInternalLinks(responseText);

        let headlinePattern = /<h1>(.*?)<\/h1>/;
        headline = responseText.match(headlinePattern)[1];
        setDocumentTitle(headline);

        pageEl.innerHTML = responseText;

        if (location.hash) {
          scrollToAnchor();
        }
      } else if (this.readyState == 4) {
        let modification = (increase) ? 1 : -1;
        let newIndex = checkRange(pageIndex + modification);

        updateURL(newIndex, null, newIndex, "replace");
        loadDoc(newIndex, increase);
      }
  });

  localStorage.setItem(LAST_VISITED, pageIndex);
}

function getIndex(textContent) {
  return textContent.substring(0, textContent.length-1);
}

function scrollToAnchor() {
  let anchorEl = document.getElementById('page').querySelector(`a[href="${location.hash}"`);
  anchorEl.scrollIntoView();
}

function cleanFromLineBreaks(text) {
  return text.replaceAll('\\n', '');
}

function replaceAnchorLink(text) {
  return text.replaceAll(/\/forums\/discussion\/comment\/\d+\//g, '');
}

// Examples:
// (new) "http://story-games.com/forums/discussion/9214/p1" rel="nonsense"
// (old) "http://www.story-games.com/forums/comments.php?DiscussionID=9214#anchor" rel="nonsense" ex. ?2866
function changeInternalLinks(text) {
  text = text.replaceAll(/\"https?:\/\/(www\.)?story-games\.com\/forums\/discussion\/\d+\S+\"/g, (match) => {
      let pageIndex = match.match(/\d+/)[0]; // new internal links
      return `"?${pageIndex}"`;
  });

  text = text.replaceAll(/\"https?:\/\/(www\.)?story-games\.com\/forums\/comments\.php\?DiscussionID=\d+\S+\"/g, (match) => {
      let pageIndex = match.match(/\d+/)[0]; // old internal links
      return `"?${pageIndex}"`;
  });

  return text;
}

function checkRange(newIndex) {
  newIndex = parseInt(newIndex);

  if (newIndex < indexInput.min) { newIndex = indexInput.min; }
  if (newIndex > indexInput.max) { newIndex = indexInput.max; }

  return newIndex;
}

function getLinkedIndex() {
  return parseInt(window.location.search.replace('?', ''));
}

/* INIT */

function init() {
  setReferences();

  setListClickListeners();
  setFooterClickListners();

  window.addEventListener('popstate', catchBrowserNavigation);
}

function firstTimeLoading() {
  if (!loadDirectLink()) {
    displaySection('list');
    setLastVisitedDocOnInput();
  }
}

function loadDirectLink() {
  let linkedIndex = getLinkedIndex();

  if (!isNaN(linkedIndex)) {
    loadDoc(linkedIndex);
    return true;
  }

  return false;
}

function setLastVisitedDocOnInput() {
  let lastVisitedPage = parseInt(localStorage.getItem(LAST_VISITED));

  if (!isNaN(lastVisitedPage)) {
    currentPageIndex = lastVisitedPage;
    indexInput.value = lastVisitedPage;
  }
}

function setReferences() {
  indexInput = document.getElementById('index');
  sectionsElem = document.querySelectorAll('section');

  listIndexes = document.getElementById('list').querySelectorAll('a > i:first-child');
  lastItemInIndexes = listIndexes[listIndexes.length - 1];
  indexInput.max = getIndex(lastItemInIndexes.textContent);
}

function catchBrowserNavigation(event) {
  let pageIndex = event.state;
  let linkedIndex = getLinkedIndex();
  let ifSearch = document.location.search.indexOf('search') >= 0,
      goToList = isNaN(linkedIndex) && !pageIndex,
      historyStoredListPage = pageIndex == LIST_INDEX,
      newDoc = pageIndex && linkedIndex != currentPageIndex || linkedIndex != currentPageIndex,
      navigateOnHashToSamePage = linkedIndex == currentPageIndex && showContent;

  if (ifSearch) {
    displaySection('searchResults');
  } else if (goToList) {
    displaySection('list');
  } else if (historyStoredListPage) {
    displaySection('list');
  } else if (newDoc) {
    loadDoc(pageIndex || linkedIndex);
  } else if (location.hash) {
    if (navigateOnHashToSamePage) {
      scrollToAnchor();
    } else {  // new hash and new doc
      loadDoc(linkedIndex);
    }
  } else {
    displaySection('page');
    scrollTo(0, 0);
  }
}

function setListClickListeners() {
  document.addEventListener('click', (event) => {
    let target = event.target,
        aElem = (target.tagName == 'A') ? target : (target.parentNode && target.parentNode.tagName == 'A') ? target.parentNode : null,
        href = aElem && aElem.href.match(/\?\d+$/),
        isInternalLink = (href) ? href[0] : false;

    if (isInternalLink) {
      let pageIndex = isInternalLink.substr(1);

      loadDoc(pageIndex);
      updateLocation(pageIndex, null, pageIndex);
      event.preventDefault();
    }
  });
}

function setFooterClickListners() {
  const menuListItems = document.querySelectorAll('footer > div');
  const searchBarInput = document.getElementById('search');

  menuListItems.forEach((menuItem) => {
    menuItem.addEventListener('click', switchTab);
  });

  indexInput.addEventListener('change', (event) => {
    let newIndex = checkRange(event.target.value);
    loadDoc(newIndex, currentPageIndex < newIndex);
    updateLocation(newIndex, null, newIndex);
  });

  searchBarInput.addEventListener('change', google);
}
