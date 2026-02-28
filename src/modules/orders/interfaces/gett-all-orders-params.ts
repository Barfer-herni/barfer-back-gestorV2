export interface GetAllOrdersParams {
    search?: string;
    sorting?: { id: string; desc: boolean }[];
    from?: string;
    to?: string;
    orderType?: string;
    limit?: number;
}