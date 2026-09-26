/* ========================================
   ラーメンレポート
   script.js
======================================== */


/* ========================================
   設定
======================================== */

const CONFIG = {

    // Google Apps ScriptのWebアプリURL
    // Code.gsをWebアプリとしてデプロイしたら
    // ここにURLを入れます。
    GAS_URL: "https://script.google.com/macros/s/AKfycbwsgde1bWLdXRUCiq9Xj94gzwUO8SE0aJxxeptLDYRiZ_IpezjcRy0xA-yxm_zZwk7MiQ/exec",

    // 1ページあたりの表示件数
    ITEMS_PER_PAGE: 7,

    // 画像の最大サイズ
    IMAGE_MAX_WIDTH: 1200,

    // JPEG品質
    IMAGE_QUALITY: 0.8
};


/* ========================================
   アプリ状態
======================================== */

const state = {

    // 全ラーメンデータ
    ramenList: [],

    // 検索後のデータ
    filteredList: [],

    // 現在のページ
    currentPage: 1,

    // 検索文字列
    searchKeyword: "",

    // 選択中ジャンル
    genre: "all",

    // 並び順
    sortOrder: "newest",

    // 現在表示しているラーメン
    selectedRamen: null,

    // 編集中の画像
    imageData: null,

    // GASから取得できたか
    gasConnected: false

};


/* ========================================
   DOM取得
======================================== */

const $ = (selector) => {
    return document.querySelector(selector);
};

const $$ = (selector) => {
    return document.querySelectorAll(selector);
};


/* ========================================
   初期化
======================================== */

document.addEventListener("DOMContentLoaded", () => {

    initializeApp();

});


async function initializeApp() {

    setupEventListeners();

    setDefaultDate();

    setupImagePreview();

    await loadRamenData();

}


/* ========================================
   イベント設定
======================================== */

function setupEventListeners() {

    /* -------------------------------
       検索
    -------------------------------- */

    const searchInput = $("#search-input");

    if (searchInput) {

        searchInput.addEventListener("input", (event) => {

            state.searchKeyword =
                event.target.value.trim();

            state.currentPage = 1;

            updateRamenList();

        });

    }


    /* -------------------------------
       フィルターボタン
    -------------------------------- */

    const filterButton = $("#filter-button");

    if (filterButton) {

        filterButton.addEventListener("click", () => {

            const panel = $("#filter-panel");

            if (!panel) {
                return;
            }

            panel.classList.toggle("active");

        });

    }


    /* -------------------------------
       ジャンル
    -------------------------------- */

    const genreFilter = $("#genre-filter");

    if (genreFilter) {

        genreFilter.addEventListener("change", (event) => {

            state.genre = event.target.value;

            state.currentPage = 1;

            updateRamenList();

        });

    }


    /* -------------------------------
       並び順
    -------------------------------- */

    const sortOrder = $("#sort-order");

    if (sortOrder) {

        sortOrder.addEventListener("change", (event) => {

            state.sortOrder = event.target.value;

            state.currentPage = 1;

            updateRamenList();

        });

    }


    /* -------------------------------
       前ページ
    -------------------------------- */

    const prevButton = $("#prev-page-button");

    if (prevButton) {

        prevButton.addEventListener("click", () => {

            if (state.currentPage <= 1) {
                return;
            }

            state.currentPage--;

            updateRamenList();

            scrollToTop();

        });

    }


    /* -------------------------------
       次ページ
    -------------------------------- */

    const nextButton = $("#next-page-button");

    if (nextButton) {

        nextButton.addEventListener("click", () => {

            const totalPages =
                Math.ceil(
                    state.filteredList.length /
                    CONFIG.ITEMS_PER_PAGE
                );

            if (state.currentPage >= totalPages) {
                return;
            }

            state.currentPage++;

            updateRamenList();

            scrollToTop();

        });

    }


    /* -------------------------------
       投稿画面を開く
    -------------------------------- */

    const floatingPostButton =
        $("#floating-post-button");

    const openPostButton =
        $("#open-post-button");

    if (floatingPostButton) {

        floatingPostButton.addEventListener(
            "click",
            openPostScreen
        );

    }

    if (openPostButton) {

        openPostButton.addEventListener(
            "click",
            openPostScreen
        );

    }


    /* -------------------------------
       一覧へ戻る
    -------------------------------- */

    const backButton =
        $("#back-to-list-button");

    const cancelButton =
        $("#cancel-post-button");

    if (backButton) {

        backButton.addEventListener(
            "click",
            closePostScreen
        );

    }

    if (cancelButton) {

        cancelButton.addEventListener(
            "click",
            closePostScreen
        );

    }


    /* -------------------------------
       投稿フォーム
    -------------------------------- */

    const form = $("#ramen-form");

    if (form) {

        form.addEventListener(
            "submit",
            handleSubmit
        );

    }


    /* -------------------------------
       詳細モーダル
    -------------------------------- */

    const closeDetailButton =
        $("#close-detail-button");

    if (closeDetailButton) {

        closeDetailButton.addEventListener(
            "click",
            closeDetailModal
        );

    }


    const modalOverlay =
        document.querySelector(
            ".modal-overlay"
        );

    if (modalOverlay) {

        modalOverlay.addEventListener(
            "click",
            closeDetailModal
        );

    }


    /* -------------------------------
       ESCキー
    -------------------------------- */

    document.addEventListener(
        "keydown",
        (event) => {

            if (event.key !== "Escape") {
                return;
            }

            closeDetailModal();

        }
    );

}


/* ========================================
   ラーメンデータ取得
======================================== */

async function loadRamenData() {

    showLoading();

    /*
     * GAS_URLが設定されている場合
     */

    if (CONFIG.GAS_URL) {

        try {

            const response =
                await fetch(
                    CONFIG.GAS_URL +
                    "?action=getRamen"
                );

            if (!response.ok) {

                throw new Error(
                    "GASへの接続に失敗しました"
                );

            }

            const result =
                await response.json();

            if (
                result.success &&
                Array.isArray(result.data)
            ) {

                state.ramenList =
                    normalizeRamenData(
                        result.data
                    );

                state.gasConnected = true;

                showToast(
                    "ラーメンデータを取得しました"
                );

            } else {

                throw new Error(
                    result.message ||
                    "データを取得できませんでした"
                );

            }

        } catch (error) {

            console.error(error);

            state.gasConnected = false;

            /*
             * GAS接続に失敗した場合は
             * localStorageを確認
             */

            const localData =
                loadLocalData();

            if (localData.length > 0) {

                state.ramenList =
                    localData;

                showToast(
                    "保存済みデータを表示しています"
                );

            } else {

                state.ramenList =
                    getSampleData();

            }

        }

    } else {

        /*
         * GAS URL未設定の場合
         */

        const localData =
            loadLocalData();

        if (localData.length > 0) {

            state.ramenList =
                localData;

        } else {

            state.ramenList =
                getSampleData();

        }

    }


    updateRamenList();

}


/* ========================================
   データ形式を統一
======================================== */

function normalizeRamenData(data) {

    return data.map((item, index) => {

        return {

            id:
                item.id ||
                `R${String(index + 1).padStart(4, "0")}`,

            shopName:
                item.shopName ||
                "",

            shopLocation:
                item.shopLocation ||
                "",

            ramenName:
                item.ramenName ||
                "",

            genre:
                item.genre ||
                "その他",

            eatenDate:
                item.eatenDate ||
                "",

            price:
                Number(item.price) || 0,

            noodleRating:
                Number(item.noodleRating) || 0,

            soupRating:
                Number(item.soupRating) || 0,

            toppingRating:
                Number(item.toppingRating) || 0,

            volumeRating:
                Number(item.volumeRating) || 0,

            overallRating:
                Number(item.overallRating) || 0,

            review:
                item.review ||
                "",

            imageUrl:
                item.imageUrl ||
                "",

            createdAt:
                item.createdAt ||
                "",

            updatedAt:
                item.updatedAt ||
                ""

        };

    });

}


/* ========================================
   一覧更新
======================================== */

function updateRamenList() {

    let list =
        [...state.ramenList];


    /* -------------------------------
       検索
    -------------------------------- */

    if (state.searchKeyword) {

        const keyword =
            state.searchKeyword.toLowerCase();

        list =
            list.filter((ramen) => {

                const target = [

                    ramen.shopName,

                    ramen.shopLocation,

                    ramen.ramenName,

                    ramen.genre,

                    ramen.review

                ]
                .join(" ")
                .toLowerCase();

                return target.includes(keyword);

            });

    }


    /* -------------------------------
       ジャンル
    -------------------------------- */

    if (state.genre !== "all") {

        list =
            list.filter((ramen) => {

                return ramen.genre ===
                    state.genre;

            });

    }


    /* -------------------------------
       並び替え
    -------------------------------- */

    list =
        sortRamenList(
            list,
            state.sortOrder
        );


    state.filteredList =
        list;


    /* -------------------------------
       ページ数調整
    -------------------------------- */

    const totalPages =
        Math.max(
            1,
            Math.ceil(
                list.length /
                CONFIG.ITEMS_PER_PAGE
            )
        );

    if (state.currentPage > totalPages) {

        state.currentPage =
            totalPages;

    }


    /* -------------------------------
       現在ページのデータ
    -------------------------------- */

    const startIndex =
        (state.currentPage - 1) *
        CONFIG.ITEMS_PER_PAGE;

    const endIndex =
        startIndex +
        CONFIG.ITEMS_PER_PAGE;

    const pageData =
        list.slice(
            startIndex,
            endIndex
        );


    renderRamenList(pageData);

    renderPagination(
        totalPages
    );

    updateCount(
        list.length
    );

}


/* ========================================
   並び替え
======================================== */

function sortRamenList(list, order) {

    const result =
        [...list];

    switch (order) {

        case "oldest":

            return result.sort(
                (a, b) =>
                    getDateValue(a.eatenDate) -
                    getDateValue(b.eatenDate)
            );


        case "rating-high":

            return result.sort(
                (a, b) =>
                    b.overallRating -
                    a.overallRating
            );


        case "rating-low":

            return result.sort(
                (a, b) =>
                    a.overallRating -
                    b.overallRating
            );


        case "price-high":

            return result.sort(
                (a, b) =>
                    b.price -
                    a.price
            );


        case "price-low":

            return result.sort(
                (a, b) =>
                    a.price -
                    b.price
            );


        case "newest":

        default:

            return result.sort(
                (a, b) =>
                    getDateValue(b.eatenDate) -
                    getDateValue(a.eatenDate)
            );

    }

}


/* ========================================
   日付を数値化
======================================== */

function getDateValue(dateString) {

    if (!dateString) {
        return 0;
    }

    const date =
        new Date(dateString);

    const time =
        date.getTime();

    return Number.isNaN(time)
        ? 0
        : time;

}


/* ========================================
   一覧描画
======================================== */

function renderRamenList(list) {

    const container =
        $("#ramen-list");

    const emptyMessage =
        $("#empty-message");

    if (!container) {
        return;
    }


    container.innerHTML = "";


    /* -------------------------------
       データなし
    -------------------------------- */

    if (list.length === 0) {

        if (emptyMessage) {

            emptyMessage.style.display =
                "block";

        }

        return;

    }


    if (emptyMessage) {

        emptyMessage.style.display =
            "none";

    }


    /* -------------------------------
       データ描画
    -------------------------------- */

    list.forEach((ramen) => {

        const card =
            createRamenCard(
                ramen
            );

        container.appendChild(card);

    });

}


/* ========================================
   ラーメンカード作成
======================================== */

function createRamenCard(ramen) {

    const card =
        document.createElement("article");

    card.className =
        "ramen-card";

    card.setAttribute(
        "role",
        "button"
    );

    card.setAttribute(
        "tabindex",
        "0"
    );


    /* -------------------------------
       画像
    -------------------------------- */

    if (ramen.imageUrl) {

        const image =
            document.createElement("img");

        image.className =
            "ramen-card-image";

        image.src =
            ramen.imageUrl;

        image.alt =
            ramen.shopName ||
            ramen.ramenName ||
            "ラーメン";

        image.loading =
            "lazy";

        image.onerror = () => {

            image.style.display =
                "none";

            const placeholder =
                createImagePlaceholder();

            image.parentNode.insertBefore(
                placeholder,
                image
            );

        };

        card.appendChild(image);

    } else {

        card.appendChild(
            createImagePlaceholder()
        );

    }


    /* -------------------------------
       情報
    -------------------------------- */

    const content =
        document.createElement("div");

    content.className =
        "ramen-card-content";


    /*
     * 店名 + 店舗名
     */

    const shop =
        document.createElement("h2");

    shop.className =
        "ramen-card-shop";

    shop.textContent =
        buildShopName(
            ramen
        );


    /*
     * メニュー名
     */

    const title =
        document.createElement("div");

    title.className =
        "ramen-card-title";

    title.textContent =
        ramen.ramenName ||
        "";


    /*
     * ジャンル
     */

    const meta =
        document.createElement("div");

    meta.className =
        "ramen-card-meta";


    const genre =
        document.createElement("span");

    genre.className =
        "ramen-card-tag";

    genre.textContent =
        ramen.genre ||
        "その他";


    meta.appendChild(
        genre
    );


    content.appendChild(
        shop
    );

    /*
     * メニュー名が店名と同じ場合は
     * 重複表示を避ける
     */

    if (
        ramen.ramenName &&
        ramen.ramenName !== ramen.shopName
    ) {

        content.appendChild(
            title
        );

    }

    content.appendChild(
        meta
    );


    card.appendChild(
        content
    );


    /* -------------------------------
       クリック
    -------------------------------- */

    card.addEventListener(
        "click",
        () => {

            openDetailModal(
                ramen
            );

        }
    );


    card.addEventListener(
        "keydown",
        (event) => {

            if (
                event.key === "Enter" ||
                event.key === " "
            ) {

                event.preventDefault();

                openDetailModal(
                    ramen
                );

            }

        }
    );


    return card;

}


/* ========================================
   店名表示
======================================== */

function buildShopName(ramen) {

    const shop =
        ramen.shopName ||
        "";

    const location =
        ramen.shopLocation ||
        "";

    if (!location) {

        return shop;

    }

    /*
     * すでに店名に店舗名が
     * 含まれている場合は重複させない
     */

    if (
        shop.includes(location)
    ) {

        return shop;

    }

    return `${shop} ${location}`;

}


/* ========================================
   画像なし表示
======================================== */

function createImagePlaceholder() {

    const placeholder =
        document.createElement("div");

    placeholder.className =
        "ramen-card-no-image";

    placeholder.textContent =
        "🍜";

    return placeholder;

}


/* ========================================
   件数表示
======================================== */

function updateCount(count) {

    const element =
        $("#ramen-count");

    if (!element) {
        return;
    }

    element.textContent =
        `${count}件`;

}


/* ========================================
   ページネーション
======================================== */

function renderPagination(totalPages) {

    const pageNumbers =
        $("#page-numbers");

    const prevButton =
        $("#prev-page-button");

    const nextButton =
        $("#next-page-button");


    if (!pageNumbers) {
        return;
    }


    pageNumbers.innerHTML = "";


    /*
     * ページ番号
     */

    for (
        let page = 1;
        page <= totalPages;
        page++
    ) {

        const button =
            document.createElement("button");

        button.type =
            "button";

        button.className =
            "page-number";

        button.textContent =
            page;


        if (
            page ===
            state.currentPage
        ) {

            button.classList.add(
                "active"
            );

            button.setAttribute(
                "aria-current",
                "page"
            );

        }


        button.addEventListener(
            "click",
            () => {

                state.currentPage =
                    page;

                updateRamenList();

                scrollToTop();

            }
        );


        pageNumbers.appendChild(
            button
        );

    }


    /*
     * 前へ
     */

    if (prevButton) {

        prevButton.disabled =
            state.currentPage <= 1;

    }


    /*
     * 次へ
     */

    if (nextButton) {

        nextButton.disabled =
            state.currentPage >=
            totalPages;

    }

}


/* ========================================
   詳細モーダル
======================================== */

function openDetailModal(ramen) {

    state.selectedRamen =
        ramen;

    const modal =
        $("#detail-modal");

    const content =
        $("#detail-content");

    if (
        !modal ||
        !content
    ) {
        return;
    }


    content.innerHTML =
        createDetailHTML(
            ramen
        );


    modal.classList.add(
        "active"
    );

    modal.setAttribute(
        "aria-hidden",
        "false"
    );

    document.body.style.overflow =
        "hidden";

}


/* ========================================
   詳細HTML
======================================== */

function createDetailHTML(ramen) {

    const imageHTML =
        ramen.imageUrl
            ? `
                <img
                    src="${escapeHTML(ramen.imageUrl)}"
                    alt="${escapeHTML(ramen.shopName)}"
                    class="detail-image"
                >
              `
            : "";


    const rating =
        createStars(
            ramen.overallRating
        );


    return `

        ${imageHTML}

        <div class="detail-shop">
            ${escapeHTML(
                buildShopName(ramen)
            )}
        </div>

        <h2 class="detail-title">
            ${escapeHTML(
                ramen.ramenName || ""
            )}
        </h2>

        <div class="detail-rating">
            ${rating}
        </div>


        <div class="detail-info">

            <div class="detail-info-item">

                <span class="detail-info-label">
                    ジャンル
                </span>

                <span class="detail-info-value">
                    ${escapeHTML(
                        ramen.genre || "-"
                    )}
                </span>

            </div>


            <div class="detail-info-item">

                <span class="detail-info-label">
                    食べた日
                </span>

                <span class="detail-info-value">
                    ${escapeHTML(
                        formatDate(
                            ramen.eatenDate
                        )
                    )}
                </span>

            </div>


            <div class="detail-info-item">

                <span class="detail-info-label">
                    価格
                </span>

                <span class="detail-info-value">

                    ${
                        ramen.price
                            ? `${Number(
                                ramen.price
                            ).toLocaleString()}円`
                            : "-"
                    }

                </span>

            </div>


            <div class="detail-info-item">

                <span class="detail-info-label">
                    麺
                </span>

                <span class="detail-info-value">
                    ${createStars(
                        ramen.noodleRating
                    )}
                </span>

            </div>


            <div class="detail-info-item">

                <span class="detail-info-label">
                    スープ
                </span>

                <span class="detail-info-value">
                    ${createStars(
                        ramen.soupRating
                    )}
                </span>

            </div>


            <div class="detail-info-item">

                <span class="detail-info-label">
                    トッピング
                </span>

                <span class="detail-info-value">
                    ${createStars(
                        ramen.toppingRating
                    )}
                </span>

            </div>


            <div class="detail-info-item">

                <span class="detail-info-label">
                    ボリューム
                </span>

                <span class="detail-info-value">
                    ${createStars(
                        ramen.volumeRating
                    )}
                </span>

            </div>

        </div>


        <div class="detail-review">

            <h3>
                感想
            </h3>

            <p>
                ${escapeHTML(
                    ramen.review ||
                    "感想はありません。"
                )}
            </p>

        </div>

    `;

}


/* ========================================
   星評価
======================================== */

function createStars(rating) {

    const value =
        Math.max(
            0,
            Math.min(
                5,
                Number(rating) || 0
            )
        );

    let result = "";

    for (
        let i = 1;
        i <= 5;
        i++
    ) {

        result +=
            i <= value
                ? "★"
                : "☆";

    }

    return result;

}


/* ========================================
   詳細モーダルを閉じる
======================================== */

function closeDetailModal() {

    const modal =
        $("#detail-modal");

    if (!modal) {
        return;
    }

    modal.classList.remove(
        "active"
    );

    modal.setAttribute(
        "aria-hidden",
        "true"
    );

    document.body.style.overflow =
        "";

}


/* ========================================
   投稿画面
======================================== */

function openPostScreen() {

    const listScreen =
        $("#list-screen");

    const postScreen =
        $("#post-screen");

    if (
        !listScreen ||
        !postScreen
    ) {
        return;
    }

    closeDetailModal();

    listScreen.classList.remove(
        "active"
    );

    postScreen.classList.add(
        "active"
    );

    window.scrollTo(
        0,
        0
    );

}


function closePostScreen() {

    const listScreen =
        $("#list-screen");

    const postScreen =
        $("#post-screen");

    if (
        !listScreen ||
        !postScreen
    ) {
        return;
    }

    postScreen.classList.remove(
        "active"
    );

    listScreen.classList.add(
        "active"
    );

    window.scrollTo(
        0,
        0
    );

}


/* ========================================
   初期日付
======================================== */

function setDefaultDate() {

    const input =
        $("#eaten-date");

    if (!input) {
        return;
    }

    if (input.value) {
        return;
    }

    const today =
        new Date();

    const year =
        today.getFullYear();

    const month =
        String(
            today.getMonth() + 1
        ).padStart(2, "0");

    const day =
        String(
            today.getDate()
        ).padStart(2, "0");

    input.value =
        `${year}-${month}-${day}`;

}


/* ========================================
   画像プレビュー
======================================== */

function setupImagePreview() {

    const input =
        $("#ramen-image");

    const preview =
        $("#image-preview");

    if (
        !input ||
        !preview
    ) {
        return;
    }


    input.addEventListener(
        "change",
        async (event) => {

            const file =
                event.target.files[0];

            if (!file) {

                preview.innerHTML = "";

                state.imageData =
                    null;

                return;

            }


            try {

                const compressed =
                    await compressImage(
                        file
                    );

                state.imageData =
                    compressed;


                preview.innerHTML = `

                    <img
                        src="${compressed}"
                        alt="ラーメン写真プレビュー"
                    >

                `;

            } catch (error) {

                console.error(error);

                showToast(
                    "画像の読み込みに失敗しました"
                );

            }

        }
    );

}


/* ========================================
   画像圧縮
======================================== */

function compressImage(file) {

    return new Promise(
        (resolve, reject) => {

            const reader =
                new FileReader();


            reader.onload = (event) => {

                const image =
                    new Image();


                image.onload = () => {

                    let width =
                        image.width;

                    let height =
                        image.height;


                    /*
                     * 最大幅を超える場合
                     * 縮小する
                     */

                    if (
                        width >
                        CONFIG.IMAGE_MAX_WIDTH
                    ) {

                        height =
                            Math.round(
                                height *
                                CONFIG.IMAGE_MAX_WIDTH /
                                width
                            );

                        width =
                            CONFIG.IMAGE_MAX_WIDTH;

                    }


                    const canvas =
                        document.createElement(
                            "canvas"
                        );

                    canvas.width =
                        width;

                    canvas.height =
                        height;


                    const context =
                        canvas.getContext(
                            "2d"
                        );


                    context.drawImage(
                        image,
                        0,
                        0,
                        width,
                        height
                    );


                    const result =
                        canvas.toDataURL(
                            "image/jpeg",
                            CONFIG.IMAGE_QUALITY
                        );


                    resolve(result);

                };


                image.onerror =
                    reject;

                image.src =
                    event.target.result;

            };


            reader.onerror =
                reject;

            reader.readAsDataURL(
                file
            );

        }
    );

}


/* ========================================
   投稿処理
======================================== */

async function handleSubmit(event) {

    event.preventDefault();


    const submitButton =
        $("#submit-button");

    if (submitButton) {

        submitButton.disabled =
            true;

        submitButton.textContent =
            "保存中...";

    }


    try {

        const data =
            collectFormData();


        /*
         * GASに保存
         */

        if (CONFIG.GAS_URL) {

            await saveToGAS(
                data
            );

        } else {

            /*
             * GAS URLがまだ設定されていない場合
             * localStorageに保存
             */

            saveToLocalStorage(
                data
            );

        }


        /*
         * 一覧にも追加
         */

        state.ramenList.unshift(
            data
        );


        resetForm();

        closePostScreen();

        state.currentPage =
            1;

        updateRamenList();

        showToast(
            "ラーメンを保存しました"
        );


    } catch (error) {

        console.error(error);

        showToast(
            error.message ||
            "保存に失敗しました"
        );

    } finally {

        if (submitButton) {

            submitButton.disabled =
                false;

            submitButton.textContent =
                "保存する";

        }

    }

}


/* ========================================
   フォームデータ取得
======================================== */

function collectFormData() {

    const shopName =
        $("#shop-name")?.value.trim() ||
        "";

    const shopLocation =
        $("#shop-location")?.value.trim() ||
        "";

    const ramenName =
        $("#ramen-name")?.value.trim() ||
        "";

    const genre =
        $("#genre")?.value ||
        "";

    const eatenDate =
        $("#eaten-date")?.value ||
        "";

    const price =
        Number(
            $("#price")?.value
        ) || 0;

    const noodleRating =
        Number(
            $("#noodle-rating")?.value
        ) || 0;

    const soupRating =
        Number(
            $("#soup-rating")?.value
        ) || 0;

    const toppingRating =
        Number(
            $("#topping-rating")?.value
        ) || 0;

    const volumeRating =
        Number(
            $("#volume-rating")?.value
        ) || 0;

    const overallRating =
        Number(
            $("#overall-rating")?.value
        ) || 0;

    const review =
        $("#review")?.value.trim() ||
        "";


    if (!shopName) {

        throw new Error(
            "店名を入力してください"
        );

    }

    if (!ramenName) {

        throw new Error(
            "メニュー名を入力してください"
        );

    }

    if (!genre) {

        throw new Error(
            "ジャンルを選択してください"
        );

    }

    if (!eatenDate) {

        throw new Error(
            "食べた日を入力してください"
        );

    }


    const now =
        new Date().toISOString();


    return {

        id:
            createId(),

        shopName:
            shopName,

        shopLocation:
            shopLocation,

        ramenName:
            ramenName,

        genre:
            genre,

        eatenDate:
            eatenDate,

        price:
            price,

        noodleRating:
            noodleRating,

        soupRating:
            soupRating,

        toppingRating:
            toppingRating,

        volumeRating:
            volumeRating,

        overallRating:
            overallRating,

        review:
            review,

        imageUrl:
            state.imageData || "",

        createdAt:
            now,

        updatedAt:
            now

    };

}


/* ========================================
   GASへ保存
======================================== */

async function saveToGAS(data) {

    const response =
        await fetch(
            CONFIG.GAS_URL,
            {

                method: "POST",

                headers: {
                    "Content-Type":
                        "text/plain;charset=utf-8"
                },

                body: JSON.stringify({

                    action:
                        "saveRamen",

                    data:
                        data

                })

            }
        );


    if (!response.ok) {

        throw new Error(
            "GASへの保存に失敗しました"
        );

    }


    const result =
        await response.json();


    if (!result.success) {

        throw new Error(
            result.message ||
            "保存に失敗しました"
        );

    }

}


/* ========================================
   localStorage保存
======================================== */

function saveToLocalStorage(data) {

    const list =
        loadLocalData();

    list.unshift(
        data
    );

    localStorage.setItem(
        "ramenReportData",
        JSON.stringify(list)
    );

}


function loadLocalData() {

    try {

        const data =
            localStorage.getItem(
                "ramenReportData"
            );

        if (!data) {
            return [];
        }

        const parsed =
            JSON.parse(data);

        return Array.isArray(parsed)
            ? parsed
            : [];

    } catch (error) {

        console.error(error);

        return [];

    }

}


/* ========================================
   フォームリセット
======================================== */

function resetForm() {

    const form =
        $("#ramen-form");

    if (form) {

        form.reset();

    }

    const preview =
        $("#image-preview");

    if (preview) {

        preview.innerHTML = "";

    }

    state.imageData =
        null;

    setDefaultDate();

}


/* ========================================
   サンプルデータ
======================================== */

function getSampleData() {

    return [

        {
            id: "R001",

            shopName:
                "家系ラーメン あさが家",

            shopLocation:
                "上野店",

            ramenName:
                "家系ラーメン",

            genre:
                "家系",

            eatenDate:
                "2026-09-25",

            price:
                1000,

            noodleRating:
                4,

            soupRating:
                5,

            toppingRating:
                4,

            volumeRating:
                4,

            overallRating:
                4,

            review:
                "濃厚なスープで美味しかった。",

            imageUrl:
                "",

            createdAt:
                "2026-09-25",

            updatedAt:
                "2026-09-25"

        },


        {
            id: "R002",

            shopName:
                "家系ラーメン 五代目野中家",

            shopLocation:
                "",

            ramenName:
                "家系ラーメン",

            genre:
                "家系",

            eatenDate:
                "2026-09-20",

            price:
                950,

            noodleRating:
                5,

            soupRating:
                4,

            toppingRating:
                4,

            volumeRating:
                5,

            overallRating:
                5,

            review:
                "麺が好み。",

            imageUrl:
                "",

            createdAt:
                "2026-09-20",

            updatedAt:
                "2026-09-20"

        },


        {
            id: "R003",

            shopName:
                "麺家 燦",

            shopLocation:
                "",

            ramenName:
                "ラーメン",

            genre:
                "家系",

            eatenDate:
                "2026-09-15",

            price:
                900,

            noodleRating:
                4,

            soupRating:
                4,

            toppingRating:
                3,

            volumeRating:
                4,

            overallRating:
                4,

            review:
                "バランスの良い一杯。",

            imageUrl:
                "",

            createdAt:
                "2026-09-15",

            updatedAt:
                "2026-09-15"

        }

    ];

}


/* ========================================
   ID生成
======================================== */

function createId() {

    const timestamp =
        Date.now()
        .toString(36);

    const random =
        Math.random()
        .toString(36)
        .substring(2, 8);

    return `R-${timestamp}-${random}`;

}


/* ========================================
   日付表示
======================================== */

function formatDate(dateString) {

    if (!dateString) {
        return "-";
    }

    const date =
        new Date(dateString);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return dateString;

    }

    const year =
        date.getFullYear();

    const month =
        String(
            date.getMonth() + 1
        ).padStart(2, "0");

    const day =
        String(
            date.getDate()
        ).padStart(2, "0");

    return `${year}/${month}/${day}`;

}


/* ========================================
   HTMLエスケープ
======================================== */

function escapeHTML(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


/* ========================================
   GAS URLの設定
======================================= */

function setGasUrl(url) {

    CONFIG.GAS_URL =
        String(url || "").trim();

}


/* ========================================
   トースト
======================================== */

function showToast(message) {

    const toast =
        $("#toast");

    if (!toast) {
        return;
    }

    toast.textContent =
        message;

    toast.classList.add(
        "show"
    );


    clearTimeout(
        showToast.timer
    );


    showToast.timer =
        setTimeout(
            () => {

                toast.classList.remove(
                    "show"
                );

            },
            2500
        );

}


/* ========================================
   ローディング
======================================== */

function showLoading() {

    const container =
        $("#ramen-list");

    if (!container) {
        return;
    }

    container.innerHTML = `

        <div
            style="
                padding:60px 20px;
                text-align:center;
                color:#777;
            "
        >
            ラーメンデータを読み込んでいます...
        </div>

    `;

}


/* ========================================
   ページトップへ
======================================== */

function scrollToTop() {

    window.scrollTo({

        top: 0,

        behavior: "smooth"

    });

}