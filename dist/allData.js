export function getPages(data, filterFuncs = [], sortFuncs = []) {
    let pages = data.filter((item) => item.draft !== true);
    filterFuncs.forEach((filterFunc) => {
        pages = filterFunc(pages);
    });
    sortFuncs.forEach((sortFunc) => {
        pages = sortFunc(pages);
    });
    return pages;
}
export function filterByKeyVal(key, val) {
    return (data) => data.filter((item) => item[key] === val);
}
export function filterByNotKeyVal(key, val) {
    return (data) => data.filter((item) => item[key] !== val);
}
export function filterItemsArrayByKey(key, val) {
    return (data) => {
        if (val === '') {
            return data;
        }
        return data.filter((item) => {
            const values = Array.isArray(item[key])
                ? item[key].map((tag) => String(tag).toLowerCase())
                : [];
            return values.includes(val.toLowerCase());
        });
    };
}
export function sortByOrderAscending(data) {
    return data.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}
export function sortByOrderDescending(data) {
    return data.sort((a, b) => (b.order ?? 0) - (a.order ?? 0));
}
export const sortByOrder = sortByOrderDescending;
export function sortByPublishDateDescending(data) {
    return data.sort((a, b) => {
        const dateA = new Date(String(a.publishDate || ''));
        const dateB = new Date(String(b.publishDate || ''));
        const timeA = Number.isNaN(dateA.getTime()) ? 0 : dateA.getTime();
        const timeB = Number.isNaN(dateB.getTime()) ? 0 : dateB.getTime();
        return timeB - timeA;
    });
}
export const sortByPublishDate = sortByPublishDateDescending;
export function sortByDate(data, key, order = 'ascending') {
    if (order === 'ascending') {
        return data.sort((a, b) => (+new Date(String(a[key])) - +new Date(String(b[key]))));
    }
    return data.sort((a, b) => (+new Date(String(b[key])) - +new Date(String(a[key]))));
}
export function filterPagesNot(data, key, val) {
    if (!data)
        return [];
    return getPages(data, [filterByNotKeyVal(key, val)], [sortByOrderDescending]);
}
export function filterPages(data, key, val) {
    if (!data)
        return [];
    return getPages(data, [filterByKeyVal(key, val)], [sortByOrderDescending]);
}
export function filterSingle(data, key, val) {
    if (!data)
        return null;
    const res = getPages(data, [filterByKeyVal(key, val)], [sortByOrderDescending]);
    return res[0] ?? null;
}
//# sourceMappingURL=allData.js.map