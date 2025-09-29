export function paginateQuery(query, { page = 1, limit = 10 } = {}) {
    const p = Math.max(parseInt(page, 10) || 1, 1);
    const l = Math.max(Math.min(parseInt(limit, 10) || 10, 100), 1);
    const skip = (p - 1) * l;
    return { skip, limit: l, page: p };
  }
  
  export function buildPagination({ totalCount, page, limit }) {
    const totalPages = Math.max(Math.ceil(totalCount / limit), 1);
    return { totalCount, page, limit, totalPages };
  }
  