// 結果を一時保存するキャッシュオブジェクト
let videoCache = JSON.parse(sessionStorage.getItem('soloVideoCache')) || {};

// キャッシュを sessionStorage に保存する関数
function saveCache() {
  sessionStorage.setItem('soloVideoCache', JSON.stringify(videoCache));
}

/**
 * サムネイル要素に「単体」を示すクラスを追加する関数
 * @param {HTMLElement} thumbnailElement - 対象のサムネイル要素
 */
function markAsSolo(thumbnailElement) {
  thumbnailElement.classList.add('show-solo-icon');
}

/**
 * URL先のページ情報を取得し、メタデータから単体作品かどうかを判定する関数
 * @param {string} url - 判定したい動画のURL
 * @param {HTMLElement} element - 対象の要素
 */
async function fetchAndCheckVideo(url, element) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Network response was not ok');
    const htmlText = await response.text();
    const doc = new DOMParser().parseFromString(htmlText, 'text/html');
    
    // 一覧ページでは男女の区別ができないため、出演者の総数で判定
    const actressMetaTags = doc.querySelectorAll('meta[property="og:video:actor"]');
    const numberOfPerformers = actressMetaTags.length;
    
    const isSolo = (numberOfPerformers === 1);
    
    videoCache[url] = { isSolo: isSolo, checkedAt: Date.now() };
    saveCache();

    if (isSolo) {
      markAsSolo(element);
    }
  } catch (error) {
    // console.error('Error fetching video details:', url, error);
    videoCache[url] = { isSolo: false, checkedAt: Date.now() };
    saveCache();
  }
}

/**
 * 動画一覧ページの処理
 */
function handleListPage() {
  setInterval(() => {
    const unprocessedThumbnails = document.querySelectorAll('.thumbnail:not([data-solo-check-processed])');
    for (const item of unprocessedThumbnails) {
      item.dataset.soloCheckProcessed = 'true';
      try {
        const link = item.querySelector('.my-2 a');
        if (link && link.href && link.href.startsWith('http')) {
          const url = link.href;
          if (videoCache[url]) {
            if (videoCache[url].isSolo) {
              markAsSolo(item);
            }
          } else {
            fetchAndCheckVideo(url, item);
          }
        }
      } catch (e) {
        // console.error("サムネイル処理中にエラー", item, e);
      }
    }
  }, 1000);
}

/**
 * 動画詳細ページの処理
 */
function handleDetailPage() {
  // ★★★ 変更点：ここから ★★★
  // メタタグではなく、画面に表示されている「女優:」の欄を直接探す方式に変更
  if (document.querySelector('.solo-icon-indicator-large')) return;

  const allSpans = document.querySelectorAll('span');
  for (let span of allSpans) {
    // 「女優:」というテキストを持つspanを探す
    if (span.textContent.trim() === '女優:') {
      // 見つけたら、その親要素に含まれるリンク(aタグ)の数を数える
      const actressContainer = span.parentElement;
      const actressLinks = actressContainer.querySelectorAll('a');
      
      // 女優のリンクが1つだけの場合にアイコンを表示
      if (actressLinks.length === 1) {
        const icon = document.createElement('div');
        icon.className = 'solo-icon-indicator-large';
        icon.textContent = '単体';
        document.body.appendChild(icon);
      }
      // 「女優:」の欄はページに1つしかないので、見つけたらループを抜ける
      break; 
    }
  }
  // ★★★ 変更ここまで ★★★
}

/**
 * メイン処理
 */
function main() {
  const path = window.location.pathname;
  if (path.match(/\/ja\/[a-z0-9]+-[a-z0-9]+/i)) {
    handleDetailPage();
  } else if (path.includes('/actresses/') || path.includes('/search') || path.includes('/new') || path.includes('/release')) {
    handleListPage();
  }
}

main();