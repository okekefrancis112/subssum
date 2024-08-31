export interface IPagination {
  hasPrevious: boolean;
  prevPage: number;
  hasNext: boolean;
  next: number;
  currentPage: number;
  total: number;
  pageSize: number;
  lastPage: number;
}
