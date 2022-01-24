import * as datefns from "date-fns/fp";
import { calculateTotalResultData } from "./calculateTotalResultData";

export type Api = (data: {
  targetId: number;
  begin: string;
  end: string;
}) => Promise<any>;

export class TotalResultDataCalculator {
  _api: Api;

  constructor(api: Api) {
    this._api = api;
  }

  async calculate({
    begin,
    end,
    userId,
  }: {
    begin: Date;
    end: Date;
    userId: number;
  }) {
    const fullDateFormat = datefns.format("yyyy-MM-dd");
    const beginOfFetch = datefns.subWeeks(1)(begin);
    const res = await this._api({
      begin: fullDateFormat(beginOfFetch),
      end: fullDateFormat(end),
      targetId: userId,
    });
    return calculateTotalResultData({
      output_type: "AGG_RESULT",
      start_date: fullDateFormat(begin),
      end_date: fullDateFormat(end),
    })(res);
  }
}
