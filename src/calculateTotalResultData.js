import moment from "moment";
import { CUSTOM_AGG, Deep_Night_AGG, OUT_WORK_AGG } from "./internal/index";

/**
 * @file 勤務記録表生成スクリプト
 */

/**
 * 勤務記録表の総合計を計算する
 *
 * <pre>
 * const data = {
 *   start_date : moment('2019-04-21').format("YYYY-MM-DD"), //具体的な期間の開始日
 *   end_date : moment('2019-05-20').format("YYYY-MM-DD"),   //具体的な期間の最終日
 *   output_type : "AGG_RESULT"                                     //AGG_RESULT:集計結果取得(勤務実績画面表示用)
 * };
 *
 * const res = await calculateTotalResultData(data);
 * </pre>
 *
 * @param {*} parameters
 * @returns function for CSV_Alone.Output on ajax
 */
export const calculateTotalResultData =
  ({ output_type, start_date, end_date }) =>
  (res) => {
    //console.log("取得確認", res);
    const body_start = moment(start_date);

    //console.log("集計開始月",start_date);
    //console.log("開始設定",res["user_data"]["work_begin"]["month_decision"]);
    let target_month = moment(start_date).format("YYYY年MM月");
    if (res["user_data"]["work_begin"]["month_decision"] == "after") {
      target_month = moment(start_date).add(1, "months").format("YYYY年MM月");
    }

    /**********************************************************/
    //変数宣言

    //給与計算用集計(分)
    let pro_holiday_late_night_work_time = 0; //休日深夜労働
    let payroll_nomal = 0; //A: 日中_通常
    let payroll_midnight_nomal = 0; //B: 深夜_通常
    let payroll_over = 0; //C: 日中_残業
    let payroll_midnight_over = 0; //D: 深夜_残業
    let payroll_holiday = 0; //E: 日中_休日
    let payroll_midnight_holiday = 0; //F: 深夜_休日
    let payroll_over_60_hour = 0; //C': 日中_残業60時間以上
    let payroll_midnight_over_60_hour = 0; //D': 深夜_残業60時間以上
    let payroll_over_inner_60_hour = 0; //C'': 日中_残業60時間以内
    let payroll_midnight_over_inner_60_hour = 0; //D'': 深夜_残業60時間以内

    let custom_payroll = []; //カスタム集計(時給時間帯)
    let custom_payroll_time = 0; //企業ごとカスタム集計_合計時間
    let custom_payroll_salary = 0; //企業ごとカスタム集計_合計給与

    //勤務日数
    let pro_work_day_number = 0; //出勤
    let pro_absence_number = 0; //全日欠勤
    let pro_late_fast_number = 0; //遅刻・早退
    let pro_late_start_number = 0; //遅刻
    let pro_fast_end_number = 0; //早退
    let pro_holiday_work_number = 0; //休日出勤
    let pro_vac_day_number = 0; //有休取得
    let pro_yuuQ_all_day_number = 0; //全日有給取得日
    let pro_holiday_number = 0; //休日(所定＋法定)
    let pro_normal_holiday_number = 0; //所定休日日数
    let pro_legal_holiday_number = 0; //法定休日日数

    //勤務時間
    let pro_work_time = 0; //勤務時間(A～F)
    let pro_break_time = 0; //休憩時間
    let pro_shift_time = 0; //シフト合計
    let pro_scheduled_work_time = 0; //所定労働時間(シフトの合計で且つ、有給消化時間を含み、休日出勤時間は除く)
    let pro_shift_over_work_time = 0; //残業時間(勤務時間-シフト合計)
    let works = { over: 0 }; //シフト外残業(退勤シフト時刻以降の時間帯の勤務時間を集計)
    let pro_legal_inner_works_over = 0; //法定内残業
    let legal_works = { over: 0 }; //法定外残業(C+D)
    let legal_works_over_inner_60_hour = 0; //法定外残業(C+D)_60時間以内
    let legal_works_over_60_hour = 0; //法定外残業(C+D)_60時間以上
    let pro_late_night_work_time = 0; //深夜労働(B+D+F)
    let pro_holiday_work_time = 0; //休日労働(E+F)
    let pro_absence_time = 0; //全日欠勤時間
    let pro_absence_not_all_day_time = 0; //欠勤時間
    let pro_late_fast_time = 0; //遅刻早退
    let pro_late_start_time = 0; //遅刻
    let pro_fast_end_time = 0; //早退
    let pro_late_start_omit_break_time = 0; //遅刻_休憩シフトを引く
    let pro_fast_end_omit_break_time = 0; //早退_休憩シフトを引く
    let pro_before_over_work_time = 0; //前残業

    let pro_normal_holiday_work_time = 0; //所定休日労働

    let pro_actual_work_time = 0; //打刻時間

    /////////////////
    //分数単位
    //休暇消化時間(集計月)
    let yuuQ_time = 0; //有休消化時間
    let furiQ_time = 0; //振休消化時間
    let daiQ_time = 0; //代休消化時間

    //休暇付与時間(集計月)
    let yuuQ_in_time = 0; //有休付与時間
    let furiQ_in_time = 0; //振休付与時間
    let daiQ_in_time = 0; //代休付与時間

    /////////////////
    //日数単位
    //休暇消化時間(集計月)
    let yuuQ_time_half_day_unit = 0; //有休消化時間
    let furiQ_time_half_day_unit = 0; //振休消化時間
    let daiQ_time_half_day_unit = 0; //代休消化時間

    //休暇付与時間(集計月)
    let yuuQ_in_time_half_day_unit = 0; //有休付与時間
    let furiQ_in_time_half_day_unit = 0; //振休付与時間
    let daiQ_in_time_half_day_unit = 0; //代休付与時間
    /////////////////

    let request_data = []; //申請内容

    let report_label_data = []; //日報ラベル集計

    let oneday_breakdown_list = []; //WEB表示用、一日ごと内わけ用配列

    //今日の日付データ
    let date = new Date();
    let today = {
      y: date.getFullYear(),
      m: date.getMonth(),
      d: date.getDate(),
    };


    //給与計算用集計
    let WEEK_NORMAL = 40 * 60; // 週の規定労働時間(分単位);
    let ONEDAY_NORMAL = 8 * 60; // 日の規定労働時間(分単位);

    let NumbermonthNormalWorklimit = 0; //月の上限
    let arrayWeekNormalWorklimit = []; //週毎の上限

    let stock_week_nomal = 0; //給与計算の際の、週労働時間計算用

    /**********************************************************/
    //ループ前処理

    //企業ごとカスタム集計枠(時給時間帯)生成
    if (res["work_agg_template"] != null) {
      res["work_agg_template"]["data"]["daily"].forEach(function (obj) {
        custom_payroll.push({
          option: obj,
          agg_result: 0,
          agg_result_array: [],
          salary: 0,
        });
      });
    }
    //console.log("カスタム集計枠(時給時間帯)",custom_payroll);

    //特殊日数集計枠生成
    var pro_exday_number_array = [];
    res["exday_list"].forEach(function (exday_list_obj) {
      if (exday_list_obj["data"]["hidden"] == "0") {
        pro_exday_number_array.push({
          id: exday_list_obj["id"],
          name: exday_list_obj["name"],
          number: 0,
        });
      }
    });
    //console.log("特殊日集計配列",pro_exday_number_array);

    res["work_record"].forEach(function (obj) {
      //console.log(["date",obj.date,body_start.isAfter(obj.date),(i < 7)]);
      obj.pre_calc = body_start.isAfter(obj.date); // 事前計算用の日付か？
    });
    //console.log(["work_record",res["work_record"]]);
    /**********************************************************/

    res["work_record"].forEach(function (obj) {
      //特殊日
      var line_exday_state = "";
      if (!obj.pre_calc) {
        //前月の週のデータは集計しない
        if (obj["data"]["exday"] != null && obj["data"]["exday"] != "") {
          //一日毎の表記では非表示設定の特殊日も表記するが、一カ月の集計では表示設定の特殊日のみ行う
          res["exday_list"].forEach(function (exday_list_obj) {
            obj["data"]["exday"].split(",").forEach(function (tg_exday_obj) {
              if (exday_list_obj["id"] == tg_exday_obj) {
                line_exday_state += "[" + exday_list_obj["name"] + "]"; //一日毎の表記
              }
            });
          });

          for (let none_hidden_exday_obj of pro_exday_number_array) {
            //一カ月分集計
            for (let tg_exday_obj of obj["data"]["exday"].split(",")) {
              if (none_hidden_exday_obj["id"] == tg_exday_obj) {
                none_hidden_exday_obj["number"] =
                  none_hidden_exday_obj["number"] + 1;
              }
            }
          }
        }
      }

      ////////////////////////////////////////////
      //申請内容集計
      let line_request_data = {};
      line_request_data["date"] = obj["date"];
      if (res["reqests"] != null) {
        res["reqests"]["data"].forEach(function (old_r_obj, old_r_i) {
          if (obj["result_start"] != "" && obj["result_end"] != "") {
            //打刻取り消しなどによって出勤打刻、退勤打刻のデータがない場合は、申請内容と異なる状態となっているため申請のアイコンを出さない
            if (
              old_r_obj["tg_date"] == obj["date"] &&
              res["reqests"]["type"][old_r_i] == 1
            ) {
              line_request_data["result_change"] = old_r_obj;
            }
          }

          if (obj["Q_type"] != 0) {
            if (
              Number(obj["yuuQ"]) < 0 ||
              Number(obj["furiQ"]) < 0 ||
              Number(obj["daiQ"]) < 0 ||
              obj["Q_type"] == 4
            ) {
              if (
                old_r_obj["tg_date"] == obj["date"] &&
                res["reqests"]["type"][old_r_i] == 2
              ) {
                line_request_data["vac"] = old_r_obj;
              }
            } else {
              if (
                old_r_obj["tg_date"] == obj["date"] &&
                res["reqests"]["type"][old_r_i] == 3
              ) {
                line_request_data["holiday_work"] = old_r_obj;
              }
            }
          }

          if (obj["data"]["over_time"]["request"] != null) {
            //現状で残業設定がない場合は判定しない
            if (
              old_r_obj["tg_date"] == obj["date"] &&
              res["reqests"]["type"][old_r_i] == 4
            ) {
              line_request_data["over_work"] = old_r_obj;
            }
          }

          if (
            old_r_obj["tg_date"] == obj["date"] &&
            res["reqests"]["type"][old_r_i] == 5
          ) {
            line_request_data["shift_change"] = old_r_obj;
          }

          if (
            old_r_obj["tg_date"] == obj["date"] &&
            res["reqests"]["type"][old_r_i] == 6
          ) {
            line_request_data["direct_bounce"] = old_r_obj;
          }

          if (obj["data"]["exday"] != null && obj["data"]["exday"] != "") {
            //現状でラベルが一つも設定されていなければ判定しない
            if (
              old_r_obj["tg_date"] == obj["date"] &&
              res["reqests"]["type"][old_r_i] == 8
            ) {
              line_request_data["exday"] = old_r_obj;
            }
          }
        });
      }
      ////////////////////////////////////////////
      //日報ラベル集計
      let line_report_label_data = [];
      if (!obj.pre_calc) {
        //前月の週のデータは集計しない
        if (
          obj["data"]["report"]["list"] != null &&
          obj["data"]["report"]["list"] != ""
        ) {
          //console.log("日報確認",obj["date"]);
          for (let report_breakdown of obj["data"]["report"]["list"]) {
            //console.log("　日報ラベル確認",report_breakdown["label"]);
            if (report_breakdown["label"] != "") {
              //ラベルが一つも設定されていない場合は処理しない
              /////////////////////
              for (let label_breakdown of report_breakdown["label"].split(
                ","
              )) {
                let f = 1;
                for (let aggregated_breakdown of line_report_label_data) {
                  //集計済みのデータを確認し、すでに対象のラベルのデータがあればそこの合計時間に加算
                  if (aggregated_breakdown["label_id"] == label_breakdown) {
                    f = 0;
                    aggregated_breakdown["total_time"] =
                      Number(aggregated_breakdown["total_time"]) +
                      Number(report_breakdown["total_time"]);
                  }
                }
                if (f) {
                  //まだ集計したことのないラベルであればデータを追加
                  if (label_breakdown == "break_time") {
                    line_report_label_data.push({
                      label_id: label_breakdown,
                      label_name: "休憩",
                      label_color: "none",
                      total_time: report_breakdown["total_time"],
                    });
                  } else if (res["all_label_list"][label_breakdown]) {
                    line_report_label_data.push({
                      label_id: label_breakdown,
                      label_name:
                        res["all_label_list"][label_breakdown]["name"],
                      label_color:
                        res["all_label_list"][label_breakdown]["color"],
                      total_time: report_breakdown["total_time"],
                    });
                  }
                }
              }
              ///////////////////
            }
          }
          //console.log("日報ラベル集計データ",line_report_label_data);
          const array = line_report_label_data;
          line_report_label_data = [];

          for (let aggregated_breakdown of array) {
            if (aggregated_breakdown["label_id"] == "break_time") {
              line_report_label_data.push(aggregated_breakdown);
            }
            //console.log("ループ確認");
          }
          for (let label_key in res["all_label_list"]) {
            for (let aggregated_breakdown of array) {
              if (label_key == aggregated_breakdown["label_id"]) {
                line_report_label_data.push(aggregated_breakdown);
              }
            }
            //console.log("ループ確認2");
          }
          //console.log("ソート後日報ラベル集計データ",line_report_label_data);
        }
      }

      ////////////////////////////////////////////

      //日付
      var y = obj["date"].split("-")[0];
      var m = obj["date"].split("-")[1];
      var d = obj["date"].split("-")[2];
      var days = ["(日)", "(月)", "(火)", "(水)", "(木)", "(金)", "(土)"];
      var day = days[new Date(obj["date"]).getDay()];
      var line_date =
        ("0" + m).slice(-2) + "月" + ("0" + d).slice(-2) + "日" + day;

      //シフト
      var line_shift = "";
      ///////////////////////////////////
      //日跨ぎ予定シフト時刻の表示調整処理
      var to_start = Number(obj["plan_start"].substr(11, 2));
      var to_end = Number(obj["plan_end"].substr(11, 2));
      var true_plan_end_time = obj["plan_end"].substr(11, 5);
      if (to_end >= to_start) {
      } //通常
      else {
        //日跨ぎ打刻の場合は処理
        if (true_plan_end_time != "") {
          //空文字の場合はsplitでエラー出るので処理しない
          var array = true_plan_end_time.split(":");
          true_plan_end_time = String(Number(array[0]) + 24) + ":" + array[1];
        }
      }
      ///////////////////////////////////
      if (obj["plan_start"] == "" && obj["plan_end"] == "") {
        line_shift = "-";
      } else {
        line_shift =
          obj["plan_start"].substr(11, 5) + "～" + true_plan_end_time;
      }
      //残業があった場合は付け加え(dataから取得)
      if (obj["data"]["over_time"] != null) {
        if (
          obj["data"]["over_time"]["auto"] ||
          obj["data"]["over_time"]["request"]
        ) {
          var true_over_end = "";
          var to_over_end = "";
          if (obj["data"]["over_time"]["auto"]) {
            true_over_end = obj["data"]["over_time"]["auto"]["end"].substr(
              11,
              5
            );
            to_over_end = Number(
              obj["data"]["over_time"]["auto"]["end"].substr(11, 2)
            );
          }
          if (obj["data"]["over_time"]["request"]) {
            true_over_end = obj["data"]["over_time"]["request"]["end"].substr(
              11,
              5
            );
            to_over_end = Number(
              obj["data"]["over_time"]["request"]["end"].substr(11, 2)
            );
          }

          if (to_over_end >= to_start) {
          } //通常
          else {
            //日跨ぎ打刻の場合は処理
            var array = true_over_end.split(":");
            true_over_end = String(Number(array[0]) + 24) + ":" + array[1];
          }
          line_shift += "(～" + true_over_end + ")";
        }
      }
      //実績
      var line_result = "";
      ///////////////////////////////////
      //日跨ぎ打刻時刻の表示調整処理
      to_start = Number(obj["result_start"].substr(11, 2));
      to_end = Number(obj["result_end"].substr(11, 2));
      var true_end_time = obj["result_end"].substr(11, 5);

      if (to_end >= to_start) {
      } //通常
      else {
        //日跨ぎ打刻の場合は処理
        if (true_end_time != "") {
          //空文字の場合はsplitでエラー出るので処理しない
          var array = true_end_time.split(":");
          true_end_time = String(Number(array[0]) + 24) + ":" + array[1];
        }
      }
      ///////////////////////////////////
      if (obj["result_start"] == "" && obj["result_end"] == "") {
        line_result = "-";
      } else {
        line_result = obj["result_start"].substr(11, 5) + "～" + true_end_time;
      }



      ///////////////////////////////////
      //打刻時間の集計
      let line_actual_work_time = 0;
      if (obj["result_start"] != "" && obj["result_end"] != "") {
        let result_break_total_time = 0;
        for (let r_breaktime_obj of obj["data"]["result_breaktime"]) {
            result_break_total_time = result_break_total_time + Number(r_breaktime_obj["total_time"]);
        }
  
        line_actual_work_time =
            Math.floor(
              (moment(obj["result_end"]) - moment(obj["result_start"])) / 60 / 1000
            ) - Number(result_break_total_time);
      }

      ///////////////////////////////////
      //6_20追加_休日出勤申請必須設定だった場合、プランなしの日はすべて打刻をなかったことに
      ///////
      //デバッグ用
      //res["user_data"]["required_request"] = {holiday_work:0,over_work:1};
      ///////

      if (res["user_data"]["required_request"] != null) {
        if (res["user_data"]["required_request"]["holiday_work"] == 1) {
          //休日出勤申請必須
          if (obj["plan_start"] == "" || obj["plan_end"] == "") {
            //集計に影響が出そうな項目を全て、打刻がなかったものとして定義しなおし
            obj["over_start"] = "";
            obj["over_end"] = "";
            obj["result_start"] = "";
            obj["result_end"] = "";
            obj["work_time"] = 0;
            //obj["break_time"] = 0; //集計上で使用しなくなったためコメントアウト
            obj["bad_start"] = 0;
            obj["bad_end"] = 0;
            obj["direct_start"] = 0;
            obj["direct_end"] = 0;
            if (obj["data"]["over_time"] != null) {
              obj["data"]["over_time"] = {
                not_over_calc: obj["data"]["over_time"]["not_over_calc"],
              };
            }
          }
        }
      }

      ///////////////////////////////////
      //console.log("残業処理確認",obj["date"]);

      let a_r_total_break_time = 0;
      ////////////////////////////////////////////
      //6_17_新形式残業ボーダーによる退勤位置割り出し処理
      if (obj["plan_start"] != "" && obj["plan_end"] != "") {
        //シフトはある
        if (obj["result_start"] != "" && obj["result_end"] != "") {
          //実績はある
          var judg_result_end = obj["result_end"];
          if (moment(obj["plan_end"]) < moment(obj["result_end"])) {
            //定時後に打刻
            if (obj["data"]["over_time"] != null) {
              if (obj["data"]["over_time"]["not_over_calc"] == "f") {
                judg_result_end = obj["plan_end"];
              } //切り捨て
              else if (obj["data"]["over_time"]["not_over_calc"] == "c") {
                judg_result_end = obj["result_end"];
              } //切り上げ(このような設定ができるようには想定していないため、あったとしてもそのままと同じ処理に)
              else if (obj["data"]["over_time"]["not_over_calc"] == "n") {
                judg_result_end = obj["result_end"];
              } //そのまま(なにもしない)

              if (obj["data"]["over_time"]["auto"]) {
                if (
                  moment(obj["data"]["over_time"]["auto"]["end"]) <
                  moment(obj["result_end"])
                ) {
                  //残業終了時刻後に打刻
                  if (obj["data"]["over_time"]["not_over_calc"] == "f") {
                    judg_result_end = obj["data"]["over_time"]["auto"]["end"];
                  } //切り捨て
                  else if (obj["data"]["over_time"]["not_over_calc"] == "c") {
                    judg_result_end = obj["result_end"];
                  } //切り上げ(このような設定ができるようには想定していないため、あったとしてもそのままと同じ処理に)
                  else if (obj["data"]["over_time"]["not_over_calc"] == "n") {
                    judg_result_end = obj["result_end"];
                  } //そのまま(なにもしない)
                } else {
                  //残業時刻未満に打刻
                  if (obj["data"]["over_time"]["auto"]["over_calc"] == "f") {
                    judg_result_end = obj["plan_end"];
                  } //切り捨て
                  if (obj["data"]["over_time"]["auto"]["over_calc"] == "c") {
                    judg_result_end = obj["data"]["over_time"]["auto"]["end"];
                  } //切り上げ
                  else if (
                    obj["data"]["over_time"]["auto"]["over_calc"] == "n"
                  ) {
                    judg_result_end = obj["result_end"];
                  } //そのまま
                }
              }

              if (obj["data"]["over_time"]["request"]) {
                if (
                  moment(obj["data"]["over_time"]["request"]["end"]) <
                  moment(obj["result_end"])
                ) {
                  //申請残業終了時刻後に打刻
                  if (obj["data"]["over_time"]["not_over_calc"] == "f") {
                    judg_result_end =
                      obj["data"]["over_time"]["request"]["end"];
                  } //切り捨て
                  else if (obj["data"]["over_time"]["not_over_calc"] == "c") {
                    judg_result_end = obj["result_end"];
                  } //切り上げ(このような設定ができるようには想定していないため、あったとしてもそのままと同じ処理に)
                  else if (obj["data"]["over_time"]["not_over_calc"] == "n") {
                    judg_result_end = obj["result_end"];
                  } //そのまま(なにもしない)
                } else {
                  //申請残業時刻未満に打刻
                  if (obj["data"]["over_time"]["request"]["over_calc"] == "f") {
                    //切り捨て
                    if (obj["data"]["over_time"]["auto"]) {
                      if (
                        moment(obj["data"]["over_time"]["auto"]["end"]) <
                        moment(obj["result_end"])
                      ) {
                        //残業終了時刻後に打刻
                        judg_result_end =
                          obj["data"]["over_time"]["auto"]["end"]; //残業終了時刻に切り捨て
                      } else {
                      } //残業終了未満の場合はすでに処理済みのためここでは処理しない
                    } else {
                      judg_result_end = obj["plan_end"]; //定時に切り捨て
                    }
                  } else if (
                    obj["data"]["over_time"]["request"]["over_calc"] == "c"
                  ) {
                    judg_result_end =
                      obj["data"]["over_time"]["request"]["end"];
                  } //切り上げ
                  else if (
                    obj["data"]["over_time"]["request"]["over_calc"] == "n"
                  ) {
                    judg_result_end = obj["result_end"];
                  } //そのまま
                }
              }
            }
          }
          obj["result_end"] = judg_result_end;
          //console.log("丸め退勤時間確認",obj["result_end"]);
          /////////////
          //退勤時間を丸めたことで勤務外になってしまった休憩は削除
          var a_r_break_time = [];
          obj["data"]["result_breaktime"].forEach(function (r_breaktime_obj) {
            if (
              moment(obj["result_start"]) < moment(r_breaktime_obj["start"]) &&
              moment(r_breaktime_obj["end"]) < moment(obj["result_end"])
            ) {
              //console.log("勤務内:" + r_breaktime_obj["start"] + "～" + r_breaktime_obj["end"]);
              a_r_break_time.push(r_breaktime_obj);
            } //else { console.log("勤務外:" + r_breaktime_obj["start"] + "～" + r_breaktime_obj["end"]); }
          });
          obj["data"]["result_breaktime"] = a_r_break_time;

          for (let r_breaktime_obj of obj["data"]["result_breaktime"]) {
            a_r_total_break_time += Number(r_breaktime_obj["total_time"]);
          }
          /////////////
          var alone_true_start = obj["plan_start"];
          if (moment(obj["plan_start"]) < moment(obj["result_start"])) {
            alone_true_start = obj["result_start"];
          }
          obj["work_time"] =
            Math.floor(
              (moment(obj["result_end"]) - moment(alone_true_start)) / 60000
            ) - Number(a_r_total_break_time);
        }
      }
      else {
        if (res["user_data"]["required_request"] != null) {
          if (res["user_data"]["required_request"]["holiday_work"] == 0) {
            //シフトがない場合でも休日出勤申請必須でなければ休憩実績の記録を集計する
            if (obj["result_start"] != "" && obj["result_end"] != "") {
              //実績はある

              for (let r_breaktime_obj of obj["data"]["result_breaktime"]) {
                a_r_total_break_time += Number(r_breaktime_obj["total_time"]);
              }
              obj["work_time"] =
              Math.floor(
                (moment(obj["result_end"]) - moment(obj["result_start"])) / 60000
              ) - Number(a_r_total_break_time);

            }
          }
        }
      }
      
      ////////////////////////////////////////////
      //console.log("動作確認");

      //グループ表記生成
      var line_group = "";
      if (res["group_data"] != null) {
        line_group = res["group_data"].name;
      } else {
        line_group = "----";
      }

      //勤務状況表記生成
      var line_state = "";
      var state_error_flag = 0; //欠勤だった場合は1に
      var in_date_search = function (days, tday) {
        let iday = "";
        days.forEach(function (value) {
          if (value["out_date"] == tday) {
            let im = value["in_date"].split("-")[1];
            let id = value["in_date"].split("-")[2];
            iday += "(" + im + "/" + id + ")";
          }
        });
        return iday;
      };
      if (obj["holiday_type"] == 0) {
        if (
          (today.y <= y && today.m + 1 < m) ||
          (today.y == y && today.m + 1 == m && today.d < d)
        ) {
          //日付が今日以降だった場合は予定に
          line_state = "予定";
        } else if (today.y == y && today.m + 1 == m && today.d == d) {
          //日付が今日だった場合は予定
          line_state = "予定";
        } else if (obj["result_start"] == "" || obj["result_end"] == "") {
          if (obj["Q_type"] == 1) {
            line_state = "有給休暇";
          } else if (obj["Q_type"] == 2) {
            line_state = "振替休暇";
            line_state += in_date_search(
              res["Q_log"]["huriQ_days"],
              obj["date"]
            );
          } else if (obj["Q_type"] == 3) {
            line_state = "代休";
            line_state += in_date_search(
              res["Q_log"]["daiQ_days"],
              obj["date"]
            );
          } else if (obj["Q_type"] == 4) {
            line_state = "慶弔休暇";
          } else {
            line_state = "欠勤";
            state_error_flag = 1;
          }
        } else {
          if (obj["Q_type"] == 1) {
            line_state = "勤務(有休)";
          } else if (obj["Q_type"] == 2) {
            line_state = "勤務(振休)";
          } else if (obj["Q_type"] == 3) {
            line_state = "勤務(代休)";
          } else if (obj["Q_type"] == 4) {
            line_state = "勤務(慶弔)";
          } else if (obj["work_time"] != 0) {
            line_state = "勤務";
          } else {
            line_state = "欠勤";
          }
        }
      } else if (obj["holiday_type"] == 1) {
        if (obj["plan_start"] == "" || obj["plan_end"] == "") {
          //休日出勤申請がない場合
          if (obj["result_start"] != "" || obj["result_end"] != "") {
            //console.log("申請必須確認",res["user_data"]["required_request"]["holiday_work"]);
            if (res["user_data"]["required_request"]["holiday_work"] == "1") {
              line_state = "未申請エラー";
            } else {
              line_state = "休日出勤";
            }
          } else {
            line_state = "所休";
          }
        } else {
          //休日出勤申請がある場合
          if (
            (today.y <= y && today.m + 1 < m) ||
            (today.y == y && today.m + 1 == m && today.d < d)
          ) {
            //日付が今日以降だった場合は予定に
            line_state = "予定(休出)";
          } else if (today.y == y && today.m + 1 == m && today.d == d) {
            //日付が今日だった場合は予定
            line_state = "予定(休出)";
          } else if (obj["result_start"] == "" || obj["result_end"] == "") {
            line_state = "欠勤(休出)";
            state_error_flag = 1;
          } else {
            line_state = "休日出勤";
          }
        }

        for (let q_log_obj of res["Q_log"]["tg_month_Q_breakdown"]) {
          if (q_log_obj["out_date"] == obj["date"]) {
            if (q_log_obj["type"] == 1) {
              line_state += "(有休消化)";
            } //有休消化
            if (q_log_obj["type"] == 2) {
              line_state += "(振休消化)";
            } //振休消化
            if (q_log_obj["type"] == 3) {
              line_state += "(代休消化)";
            } //代休消化
          }
          if (
            q_log_obj["in_date"] == obj["date"] &&
            q_log_obj["out_date"] == ""
          ) {
            if (q_log_obj["type"] == 1) {
              line_state += "(有休付与)";
            } //有休付与
            if (q_log_obj["type"] == 2) {
              line_state += "(振休付与)";
            } //振休付与
            if (q_log_obj["type"] == 3) {
              line_state += "(代休付与)";
            } //代休付与
          }
        }
      } else if (obj["holiday_type"] == 2) {
        if (obj["plan_start"] == "" || obj["plan_end"] == "") {
          //休日出勤申請がない場合
          if (obj["result_start"] != "" || obj["result_end"] != "") {
            if (res["user_data"]["required_request"]["holiday_work"] == "1") {
              line_state = "未申請エラー";
            } else {
              line_state = "休日出勤";
            }
          } else {
            line_state = "法休";
          }
        } else {
          //休日出勤申請がある場合
          if (
            (today.y <= y && today.m + 1 < m) ||
            (today.y == y && today.m + 1 == m && today.d < d)
          ) {
            //日付が今日以降だった場合は予定に
            line_state = "予定(休出)";
          } else if (today.y == y && today.m + 1 == m && today.d == d) {
            //日付が今日だった場合は予定
            line_state = "予定(休出)";
          } else if (obj["result_start"] == "" || obj["result_end"] == "") {
            line_state = "欠勤(休出)";
            state_error_flag = 1;
          } else {
            line_state = "休日出勤";
          }
        }

        for (let q_log_obj of res["Q_log"]["tg_month_Q_breakdown"]) {
          if (q_log_obj["out_date"] == obj["date"]) {
            if (q_log_obj["type"] == 1) {
              line_state += "(有休消化)";
            } //有休消化
            if (q_log_obj["type"] == 2) {
              line_state += "(振休消化)";
            } //振休消化
            if (q_log_obj["type"] == 3) {
              line_state += "(代休消化)";
            } //代休消化
          }
          if (
            q_log_obj["in_date"] == obj["date"] &&
            q_log_obj["out_date"] == ""
          ) {
            if (q_log_obj["type"] == 1) {
              line_state += "(有休付与)";
            } //有休付与
            if (q_log_obj["type"] == 2) {
              line_state += "(振休付与)";
            } //振休付与
            if (q_log_obj["type"] == 3) {
              line_state += "(代休付与)";
            } //代休付与
          }
        }
      }
      if (today.y == y && today.m + 1 == m && today.d == d) {
        //日付が今日だった場合は打刻エラー処理はしない
        //今日のぶん
      } else {
        //今日以外
        if (
          (obj["result_start"] != "" && obj["result_end"] == "") ||
          (obj["result_start"] == "" && obj["result_end"] != "")
        ) {
          line_state += "(打刻エラー)"; //片方打刻がなければ打刻エラー表示をつける
        } else {
          //打刻エラーではない
        }
      }

      if (obj["plan_start"] != "" && obj["plan_end"] != "") {
        if (obj["work_time"] != 0) {
          if (obj["bad_start"] == "1" && obj["bad_end"] == "1") {
            line_state += "(遅刻・早退)"; // 遅刻・早退に該当すれば表示を「遅刻・早退」にする。
          } else if (obj["bad_start"] == "1" && obj["bad_end"] == "0") {
            line_state += "(遅刻)"; // 遅刻・早退に該当すれば表示を「遅刻・早退」にする。
          } else if (obj["bad_start"] == "0" && obj["bad_end"] == "1") {
            line_state += "(早退)"; // 遅刻・早退に該当すれば表示を「遅刻・早退」にする。
          }
        }
      }

      var line_break_time = "";
      if (state_error_flag) {
        //休憩時間(欠勤扱いなので0時間で表示)
        line_break_time = 0;
      } else {
        //休憩時間(通常)
        line_break_time = Number(a_r_total_break_time); //旧休憩時間を使っているのでここはPDF廃止の際に修正したい
      }

      //////////////////////////////////////////////////////
      //////////////////////////////////////////////////////
      //////////////////////////////////////////////////////
      //給与計算用集計
      let weeks = [
        "sunday",
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
      ];

      //let oneday_before_out_work_time = 0; //シフト前勤務時間（新シフト外前残業時間）(前残業の仕様が定まったらここで集計するようにしたい)
      let oneday_after_out_work_time = 0; //シフト後勤務時間（新シフト外残業時間）

      //一日ごとの集計用の変数
      var oneday_payroll_nomal = 0; //A: 日中_通常
      var oneday_payroll_midnight_nomal = 0; //B: 深夜_通常
      var oneday_payroll_over = 0; //C: 日中_残業
      var oneday_payroll_midnight_over = 0; //D: 深夜_残業
      var oneday_payroll_holiday = 0; //E: 日中_休日
      var oneday_payroll_midnight_holiday = 0; //F: 深夜_休日
      let oneday_payroll_over_60_hour = 0; //C': 日中_残業60時間以上
      let oneday_payroll_midnight_over_60_hour = 0; //D': 深夜_残業60時間以上
      let oneday_payroll_over_inner_60_hour = 0; //C'': 日中_残業60時間以内
      let oneday_payroll_midnight_over_inner_60_hour = 0; //D'': 深夜_残業60時間以内
      let oneday_payroll_type_breakdown = []; //グラフ表示のために給与タイプの時刻内わけ配列を作成
      let oneday_payroll_over_60_hour_breakdown = []; //グラフ表示用残業60時間以上時刻内わけ

      let custom_onday_payroll = []; //企業ごとカスタム集計
      //企業ごとカスタム集計枠設定
      if (res["work_agg_template"] != null) {
        res["work_agg_template"]["data"]["daily"].forEach(function (w_a_d_obj) {
          custom_onday_payroll.push({
            option: w_a_d_obj,
            agg_result: 0,
            agg_result_array: [],
          });
        });
      }
      //console.log("日毎カスタム集計枠",custom_onday_payroll);

      ////////////////////////////////////////////
      //勤務時間の配列生成
      var work_time_breakdown = [];
      if (Number(obj["work_time"]) > 0) {
        if (moment(obj["result_start"]) < moment(obj["plan_start"])) {
          work_time_breakdown = [
            { start: obj["plan_start"], end: "", total_time: "" },
          ];
        } else {
          work_time_breakdown = [
            { start: obj["result_start"], end: "", total_time: "" },
          ];
        }
        obj["data"]["result_breaktime"].forEach(function (r_breaktime_obj) {
          work_time_breakdown[work_time_breakdown.length - 1]["end"] =
            r_breaktime_obj["start"];
          work_time_breakdown[work_time_breakdown.length - 1]["total_time"] =
            Math.floor(
              (moment(r_breaktime_obj["start"]) -
                moment(
                  work_time_breakdown[work_time_breakdown.length - 1]["start"]
                )) /
                60000
            );
          work_time_breakdown.push({
            start: r_breaktime_obj["end"],
            end: "",
            total_time: "",
          });
        });
        work_time_breakdown[work_time_breakdown.length - 1]["end"] =
          obj["result_end"];
        work_time_breakdown[work_time_breakdown.length - 1]["total_time"] =
          Math.floor(
            (moment(obj["result_end"]) -
              moment(
                work_time_breakdown[work_time_breakdown.length - 1]["start"]
              )) /
              60000
          );

        //日跨ぎで分割する
        var a_w_t_b = work_time_breakdown;
        var work_time_breakdown = [];
        a_w_t_b.forEach(function (r_breaktime_obj) {
          if (
            r_breaktime_obj["start"].substr(0, 10) ==
            r_breaktime_obj["end"].substr(0, 10)
          ) {
            work_time_breakdown.push(r_breaktime_obj);
          } else {
            //console.log("日跨ぎ");
            var a_t_end = moment(r_breaktime_obj["start"])
              .add(1, "days")
              .format("YYYY-MM-DD 00:00:00");
            var a_t_total = Math.floor(
              (moment(a_t_end) - moment(r_breaktime_obj["start"])) / 60000
            );
            work_time_breakdown.push({
              start: r_breaktime_obj["start"],
              end: a_t_end,
              total_time: a_t_total,
            });
            a_t_total = Math.floor(
              (moment(r_breaktime_obj["end"]) - moment(a_t_end)) / 60000
            );
            work_time_breakdown.push({
              start: a_t_end,
              end: r_breaktime_obj["end"],
              total_time: a_t_total,
            });
          }
        });
      }
      //console.log("勤務時間内わけ",obj["date"],work_time_breakdown);
      ////////////////////////////////////////////

      if (res["user_data"].work_begin.day == weeks[moment(obj["date"]).day()]) {
        stock_week_nomal = 0; //週毎の勤務時間上限ストック初期化
        //console.log("週毎の勤務時間上限ストック初期化");
      }

      //変形労働制の場合は日の上限、週の上限を上書き
      if(res["shift_template_data"]["working_type"] != null){
        if(res["shift_template_data"]["working_type"] == 1){
          //console.log("変形労働制");

          
          if(obj["normal_work_limit"] < 8*60){
            ONEDAY_NORMAL = 8*60; //日の上限が8時間を下回る場合は8時間で代入
          } else {
            ONEDAY_NORMAL = obj["normal_work_limit"];
          }
          
          if (res["user_data"].work_begin.day == weeks[moment(obj["date"]).day()]) {
            //console.log("週毎の勤務時間上限ストック初期化",obj["date"],obj);
            //この週の法定内労働時間の上限を計算
            let limitWeekNormal = 0;
            for(let objWorkRecord of res["work_record"]){
              if(moment(obj["date"]) <= moment(objWorkRecord["date"]) && moment(objWorkRecord["date"]) <= moment(obj["date"]).add(6, 'days')){
                //console.log(objWorkRecord["date"],objWorkRecord["normal_work_limit"]);
                limitWeekNormal = limitWeekNormal + objWorkRecord["normal_work_limit"];
              }
            }
            if(limitWeekNormal < 40*60){
              WEEK_NORMAL = 40*60; //週の上限が40時間を下回る場合は8時間で代入
            } else {
              WEEK_NORMAL = limitWeekNormal;
            }
            //console.log("この週の法定内労働の上限",WEEK_NORMAL + "分",WEEK_NORMAL / 60 + "時間");

            arrayWeekNormalWorklimit.push({
              start: obj["date"],
              end: moment(obj["date"]).add(6, 'days').format("YYYY-MM-DD"),
              total_limit_time: limitWeekNormal,
            });
          }
        }
      }
      //console.log(obj["date"],"給与計算用の上限","日の上限" + ONEDAY_NORMAL,"週の上限" + WEEK_NORMAL + "分(" + WEEK_NORMAL / 60 + "時間)");

      //A,B,C,D,E,F算出
      if (Number(obj["work_time"]) > 0) {
        //通常勤務時間（残業時間ではない）を抽出
        //ONEDAY_NORMAL = 8*60;// 日の規定労働時間(分単位) ※変形労働制の場合は可変
        //WEEK_NORMAL = 40*60;// 週の規定労働時間(分単位) ※変形労働制の場合は可変
        var stock_oneday_nomal = 0; //日毎の勤務時間上限ストック
        var nomal_work_time_breakdown = []; //通常勤務時間内わけ配列

        work_time_breakdown.forEach(function (w_b_obj) {
          //勤務内わけぶんループ
          var h_type_flag = 0; //勤務内わけごとにそれが法定休日の労働かそう例外かの判定を行う
          res["work_record"].forEach(function (j_f_t_obj) {
            if (j_f_t_obj["date"] == w_b_obj["start"].substr(0, 10)) {
              if (Number(j_f_t_obj["holiday_type"]) == 2) {
                h_type_flag = 1;
              }
            }
          });
          //console.log("集計期間の次の日データ確認",res["next_day_data"]);
          if (res["next_day_data"]["date"] == w_b_obj["start"].substr(0, 10)) {
            if (Number(res["next_day_data"]["holiday_type"]) == 2) {
              h_type_flag = 1;
            }
          } //集計期間の

          if (h_type_flag) {
            //console.log("法定休日判定");
            //E,F算出
            oneday_payroll_midnight_holiday += Deep_Night_AGG(
              obj["date"],
              w_b_obj
            )["night"]["total_time"]; //F: 深夜_休日
            oneday_payroll_holiday +=
              Number(w_b_obj["total_time"]) -
              Deep_Night_AGG(obj["date"], w_b_obj)["night"]["total_time"]; //E: 日中_休日

            var dna_res = Deep_Night_AGG(obj["date"], w_b_obj);
            ///////////////
            if(moment(dna_res["nomal"]["start"]) < moment(dna_res["night"]["start"])){
              if (dna_res["nomal"]["total_time"] != 0) {
                oneday_payroll_type_breakdown.push({
                  start: dna_res["nomal"]["start"],
                  end: dna_res["nomal"]["end"],
                  total_time: dna_res["nomal"]["total_time"],
                  payroll_type: "E",
                });
              }
              if (dna_res["night"]["total_time"] != 0) {
                oneday_payroll_type_breakdown.push({
                  start: dna_res["night"]["start"],
                  end: dna_res["night"]["end"],
                  total_time: dna_res["night"]["total_time"],
                  payroll_type: "F",
                });
              }
            } else {
              if (dna_res["night"]["total_time"] != 0) {
                oneday_payroll_type_breakdown.push({
                  start: dna_res["night"]["start"],
                  end: dna_res["night"]["end"],
                  total_time: dna_res["night"]["total_time"],
                  payroll_type: "F",
                });
              }
              if (dna_res["nomal"]["total_time"] != 0) {
                oneday_payroll_type_breakdown.push({
                  start: dna_res["nomal"]["start"],
                  end: dna_res["nomal"]["end"],
                  total_time: dna_res["nomal"]["total_time"],
                  payroll_type: "E",
                });
              }
            }
            ///////////////
          } else {
            //console.log("平日、所定休日判定");
            //A,B,C,D算出

            if (
              stock_oneday_nomal + Number(w_b_obj["total_time"]) <
                ONEDAY_NORMAL &&
              stock_week_nomal + Number(w_b_obj["total_time"]) < WEEK_NORMAL
            ) {
              //通常労働上限内の処理
              stock_oneday_nomal =
                stock_oneday_nomal + Number(w_b_obj["total_time"]); //日毎の勤務時間上限ストック追加
              stock_week_nomal =
                stock_week_nomal + Number(w_b_obj["total_time"]); //週毎の勤務時間上限ストック追加
              //nomal_work_time_breakdown.push(w_b_obj); //通常勤務時間配列にそのまま挿入
              oneday_payroll_midnight_nomal += Deep_Night_AGG(
                obj["date"],
                w_b_obj
              )["night"]["total_time"]; //B: 深夜_通常
              oneday_payroll_nomal +=
                Number(w_b_obj["total_time"]) -
                Deep_Night_AGG(obj["date"], w_b_obj)["night"]["total_time"]; //A: 日中_通常

              var dna_res = Deep_Night_AGG(obj["date"], w_b_obj);
              ///////////////
              if(moment(dna_res["nomal"]["start"]) < moment(dna_res["night"]["start"])){
                if (dna_res["nomal"]["total_time"] != 0) {
                  oneday_payroll_type_breakdown.push({
                    start: dna_res["nomal"]["start"],
                    end: dna_res["nomal"]["end"],
                    total_time: dna_res["nomal"]["total_time"],
                    payroll_type: "A",
                  });
                  if (dna_res["night"]["total_time"] != 0) {
                    oneday_payroll_type_breakdown.push({
                      start: dna_res["night"]["start"],
                      end: dna_res["night"]["end"],
                      total_time: dna_res["night"]["total_time"],
                      payroll_type: "B",
                    });
                  }
                }
              } else {
                if (dna_res["night"]["total_time"] != 0) {
                  oneday_payroll_type_breakdown.push({
                    start: dna_res["night"]["start"],
                    end: dna_res["night"]["end"],
                    total_time: dna_res["night"]["total_time"],
                    payroll_type: "B",
                  });
                }
                if (dna_res["nomal"]["total_time"] != 0) {
                  oneday_payroll_type_breakdown.push({
                    start: dna_res["nomal"]["start"],
                    end: dna_res["nomal"]["end"],
                    total_time: dna_res["nomal"]["total_time"],
                    payroll_type: "A",
                  });
                }
              }
              ///////////////
            } else {
              //通常労働上限の処理
              if (
                ONEDAY_NORMAL == stock_oneday_nomal ||
                WEEK_NORMAL == stock_week_nomal
              ) {
                //全て上限以上(残業)
                oneday_payroll_midnight_over += Deep_Night_AGG(
                  obj["date"],
                  w_b_obj
                )["night"]["total_time"]; //D: 深夜_残業
                oneday_payroll_over +=
                  Number(w_b_obj["total_time"]) -
                  Deep_Night_AGG(obj["date"], w_b_obj)["night"]["total_time"]; //C: 日中_残業

                var dna_res = Deep_Night_AGG(obj["date"], w_b_obj);
                ///////////////
                if(moment(dna_res["nomal"]["start"]) < moment(dna_res["night"]["start"])){
                  if (dna_res["nomal"]["total_time"] != 0) {
                    oneday_payroll_type_breakdown.push({
                      start: dna_res["nomal"]["start"],
                      end: dna_res["nomal"]["end"],
                      total_time: dna_res["nomal"]["total_time"],
                      payroll_type: "C",
                    });
                  }
                  if (dna_res["night"]["total_time"] != 0) {
                    oneday_payroll_type_breakdown.push({
                      start: dna_res["night"]["start"],
                      end: dna_res["night"]["end"],
                      total_time: dna_res["night"]["total_time"],
                      payroll_type: "D",
                    });
                  }
                } else {
                  if (dna_res["night"]["total_time"] != 0) {
                    oneday_payroll_type_breakdown.push({
                      start: dna_res["night"]["start"],
                      end: dna_res["night"]["end"],
                      total_time: dna_res["night"]["total_time"],
                      payroll_type: "D",
                    });
                  }
                  if (dna_res["nomal"]["total_time"] != 0) {
                    oneday_payroll_type_breakdown.push({
                      start: dna_res["nomal"]["start"],
                      end: dna_res["nomal"]["end"],
                      total_time: dna_res["nomal"]["total_time"],
                      payroll_type: "C",
                    });
                  }
                }
                ///////////////
              } else {
                //端数が上限以上(残業)
                var fraction_time = 0;
                if (
                  ONEDAY_NORMAL - stock_oneday_nomal <
                  WEEK_NORMAL - stock_week_nomal
                ) {
                  //日と週のどちらの上限を超えたか判定
                  fraction_time = ONEDAY_NORMAL - stock_oneday_nomal;
                } else {
                  fraction_time = WEEK_NORMAL - stock_week_nomal;
                }

                //console.log("端数",fraction_time);
                stock_oneday_nomal = stock_oneday_nomal + Number(fraction_time); //日毎の勤務時間上限ストック追加
                stock_week_nomal = stock_week_nomal + Number(fraction_time); //週毎の勤務時間上限ストック追加

                nomal_work_time_breakdown.push({
                  start: w_b_obj["start"],
                  end: moment(w_b_obj["start"])
                    .add(fraction_time, "m")
                    .format("YYYY-MM-DD HH:mm:ss"),
                  total_time: fraction_time,
                }); //通常勤務時間上限の時刻で区切った時間を通常勤務時間配列に挿入
                var fraction_obj = {
                  start: w_b_obj["start"],
                  end: moment(w_b_obj["start"])
                    .add(fraction_time, "m")
                    .format("YYYY-MM-DD HH:mm:ss"),
                  total_time: fraction_time,
                };
                oneday_payroll_midnight_nomal += Deep_Night_AGG(
                  obj["date"],
                  fraction_obj
                )["night"]["total_time"]; //B: 深夜_通常
                oneday_payroll_nomal +=
                  Number(fraction_time) -
                  Deep_Night_AGG(obj["date"], fraction_obj)["night"][
                    "total_time"
                  ]; //A: 日中_通常

                var dna_res = Deep_Night_AGG(obj["date"], fraction_obj);
                ///////////////
                if(moment(dna_res["nomal"]["start"]) < moment(dna_res["night"]["start"])){
                  if (dna_res["nomal"]["total_time"] != 0) {
                    oneday_payroll_type_breakdown.push({
                      start: dna_res["nomal"]["start"],
                      end: dna_res["nomal"]["end"],
                      total_time: dna_res["nomal"]["total_time"],
                      payroll_type: "A",
                    });
                  }
                  if (dna_res["night"]["total_time"] != 0) {
                    oneday_payroll_type_breakdown.push({
                      start: dna_res["night"]["start"],
                      end: dna_res["night"]["end"],
                      total_time: dna_res["night"]["total_time"],
                      payroll_type: "B",
                    });
                  }
                } else {
                  if (dna_res["night"]["total_time"] != 0) {
                    oneday_payroll_type_breakdown.push({
                      start: dna_res["night"]["start"],
                      end: dna_res["night"]["end"],
                      total_time: dna_res["night"]["total_time"],
                      payroll_type: "B",
                    });
                  }
                  if (dna_res["nomal"]["total_time"] != 0) {
                    oneday_payroll_type_breakdown.push({
                      start: dna_res["nomal"]["start"],
                      end: dna_res["nomal"]["end"],
                      total_time: dna_res["nomal"]["total_time"],
                      payroll_type: "A",
                    });
                  }
                }
                ///////////////

                var alone_total_time =
                  Number(w_b_obj["total_time"]) - Number(fraction_time);
                fraction_obj = {
                  start: moment(w_b_obj["start"])
                    .add(fraction_time, "m")
                    .format("YYYY-MM-DD HH:mm:ss"),
                  end: w_b_obj["end"],
                  total_time: alone_total_time,
                };
                oneday_payroll_midnight_over += Deep_Night_AGG(
                  obj["date"],
                  fraction_obj
                )["night"]["total_time"]; //D: 深夜_残業
                oneday_payroll_over +=
                  Number(alone_total_time) -
                  Deep_Night_AGG(obj["date"], fraction_obj)["night"][
                    "total_time"
                  ]; //C: 日中_残業

                dna_res = Deep_Night_AGG(obj["date"], fraction_obj);
                ///////////////
                if(moment(dna_res["nomal"]["start"]) < moment(dna_res["night"]["start"])){
                  if (dna_res["nomal"]["total_time"] != 0) {
                    oneday_payroll_type_breakdown.push({
                      start: dna_res["nomal"]["start"],
                      end: dna_res["nomal"]["end"],
                      total_time: dna_res["nomal"]["total_time"],
                      payroll_type: "C",
                    });
                  }
                  if (dna_res["night"]["total_time"] != 0) {
                    oneday_payroll_type_breakdown.push({
                      start: dna_res["night"]["start"],
                      end: dna_res["night"]["end"],
                      total_time: dna_res["night"]["total_time"],
                      payroll_type: "D",
                    });
                  }
                } else {
                  if (dna_res["night"]["total_time"] != 0) {
                    oneday_payroll_type_breakdown.push({
                      start: dna_res["night"]["start"],
                      end: dna_res["night"]["end"],
                      total_time: dna_res["night"]["total_time"],
                      payroll_type: "D",
                    });
                  }
                  if (dna_res["nomal"]["total_time"] != 0) {
                    oneday_payroll_type_breakdown.push({
                      start: dna_res["nomal"]["start"],
                      end: dna_res["nomal"]["end"],
                      total_time: dna_res["nomal"]["total_time"],
                      payroll_type: "C",
                    });
                  }
                }
                ///////////////
              }
            }
          }

          /////////////////////////
          //60以上の残業C',D'の集計
          //console.log("残業累積確認",obj["date"],payroll_over, payroll_midnight_over, oneday_payroll_over, oneday_payroll_midnight_over);
          if(3600 < payroll_over + payroll_midnight_over){
            //console.log("残業60越え(全て)",obj["date"],oneday_payroll_over_60_hour);
            oneday_payroll_over_60_hour = oneday_payroll_over;
            oneday_payroll_midnight_over_60_hour = oneday_payroll_midnight_over;

            for(let payrollTypeObj of oneday_payroll_type_breakdown){
              //console.log("配列確認",payrollTypeObj);
              if(payrollTypeObj["payroll_type"] == "C" || payrollTypeObj["payroll_type"] == "D"){

                oneday_payroll_over_60_hour_breakdown.push(payrollTypeObj); //配列挿入

                if(payrollTypeObj["payroll_type"] == "C"){
                  oneday_payroll_over_60_hour_breakdown[oneday_payroll_over_60_hour_breakdown.length - 1]["payroll_type"] = "C'"; //配列のタイプ部分変更
                } else if(payrollTypeObj["payroll_type"] == "D"){
                  oneday_payroll_over_60_hour_breakdown[oneday_payroll_over_60_hour_breakdown.length - 1]["payroll_type"] = "D'"; //配列のタイプ部分変更
                }

              }
            }

          } else if(3600 < payroll_over + payroll_midnight_over + oneday_payroll_over + oneday_payroll_midnight_over){
            //console.log("残業60越え(一部)",obj["date"],oneday_payroll_over_60_hour);
            
            let overStack60 = payroll_over + payroll_midnight_over;

            for(let payrollTypeObj of oneday_payroll_type_breakdown){
              //console.log("配列確認",payrollTypeObj);
              if(payrollTypeObj["payroll_type"] == "C" || payrollTypeObj["payroll_type"] == "D"){
                //C,Dだったら処理　※法休かどうかはA~Fの振り分けの時に考慮しているので気にしなくてよい
                if(overStack60 > 3600){
                  //全ての時間が60時間を越えている

                  if(payrollTypeObj["payroll_type"] == "C"){
                    oneday_payroll_over_60_hour += payrollTypeObj["total_time"];

                    oneday_payroll_over_60_hour_breakdown.push(payrollTypeObj); //配列挿入
                    oneday_payroll_over_60_hour_breakdown[oneday_payroll_over_60_hour_breakdown.length - 1]["payroll_type"] = "C'"; //配列のタイプ部分変更
                  } else if(payrollTypeObj["payroll_type"] == "D"){
                    oneday_payroll_midnight_over_60_hour += payrollTypeObj["total_time"];

                    oneday_payroll_over_60_hour_breakdown.push(payrollTypeObj); //配列挿入
                    oneday_payroll_over_60_hour_breakdown[oneday_payroll_over_60_hour_breakdown.length - 1]["payroll_type"] = "D'"; //配列のタイプ部分変更
                  }

                } else if(overStack60 + payrollTypeObj["total_time"] > 3600){
                  //一部の時間が60時間を越えている
                  
                  let totalTime = (overStack60 + payrollTypeObj["total_time"]) - 3600;
                  let start = moment(payrollTypeObj["end"]).subtract(totalTime, 'm').format('YYYY-MM-DD HH:mm:ss');
                  oneday_payroll_over_60_hour_breakdown.push({
                    start: start,
                    end: payrollTypeObj["end"],
                    total_time: totalTime,
                    payroll_type: payrollTypeObj["payroll_type"],
                  });
                  
                  if(payrollTypeObj["payroll_type"] == "C"){
                    oneday_payroll_over_60_hour += (overStack60 + payrollTypeObj["total_time"]) - 3600;

                    oneday_payroll_over_60_hour_breakdown[oneday_payroll_over_60_hour_breakdown.length - 1]["payroll_type"] = "C'"; //配列のタイプ部分変更
                  } else if(payrollTypeObj["payroll_type"] == "D"){
                    oneday_payroll_midnight_over_60_hour += (overStack60 + payrollTypeObj["total_time"]) - 3600;

                    oneday_payroll_over_60_hour_breakdown[oneday_payroll_over_60_hour_breakdown.length - 1]["payroll_type"] = "D'"; //配列のタイプ部分変更
                  }

                }

                overStack60 = overStack60 + payrollTypeObj["total_time"];
              }
            }
          }
          /////////////////////////


          //カスタム集計処理
          custom_onday_payroll.forEach(function (_, c_o_p_i) {
            const a_r = custom_onday_payroll[c_o_p_i]["agg_result"];
            const c_agg = CUSTOM_AGG(
              obj["date"],
              w_b_obj,
              custom_onday_payroll[c_o_p_i]["option"]
            );
            custom_onday_payroll[c_o_p_i]["agg_result"] =
              a_r + c_agg["total_time"];
            if (c_agg["total_time"] > 0) {
              custom_onday_payroll[c_o_p_i]["agg_result_array"].push(c_agg);
            }
          });

          ///////////////////////////////////////////////
          //新シフト外残業（シフト外勤務）
          //oneday_before_out_work_time += 0; //シフト前勤務時間（新シフト外前残業時間）(前残業の仕様が定まったらここで集計するようにしたい)

          if (moment(obj["result_end"]) - moment(obj["plan_end"]) > 0) {
            //シフト後勤務時間（新シフト外残業時間）
            const after_out_work_period = {
              start: obj["plan_end"],
              end: obj["result_end"],
            }; //日付情報も含んだ時刻を渡す
            //console.log(obj["date"] + "シフト後勤務期間",after_out_work_period);
            oneday_after_out_work_time += OUT_WORK_AGG(
              w_b_obj,
              after_out_work_period
            )["total_time"];
            //console.log(obj["date"] + "シフト後勤務時間計算途中",oneday_after_out_work_time);
          }
          ///////////////////////////////////////////////
        });
      }
      //console.log("通常勤務時間内わけ",obj["date"],nomal_work_time_breakdown);
      //console.log("週毎の勤務時間上限ストック",stock_week_nomal);

      //console.log(obj["date"] + "シフト前勤務時間",oneday_before_out_work_time);
      //console.log(obj["date"] + "シフト後勤務時間",oneday_after_out_work_time);

      //それぞれ月ごと集計の変数に加算
      if (!obj["pre_calc"]) {
        //本ループ
        NumbermonthNormalWorklimit = NumbermonthNormalWorklimit + Number(obj["normal_work_limit"]); //月合計の上限

        payroll_nomal = payroll_nomal + oneday_payroll_nomal;
        payroll_midnight_nomal =
          payroll_midnight_nomal + oneday_payroll_midnight_nomal;
        payroll_over = payroll_over + oneday_payroll_over;
        payroll_midnight_over =
          payroll_midnight_over + oneday_payroll_midnight_over;
        payroll_holiday = payroll_holiday + oneday_payroll_holiday;
        payroll_midnight_holiday =
          payroll_midnight_holiday + oneday_payroll_midnight_holiday;
        
        payroll_over_60_hour = payroll_over_60_hour + oneday_payroll_over_60_hour;
        payroll_midnight_over_60_hour =
            payroll_midnight_over_60_hour + oneday_payroll_midnight_over_60_hour;
      } else {
        //事前ループ
      }

      // 週の事前計算用の日の場合、ここまででいい
      if (obj["pre_calc"]) return;

      ////////////////////////////////
      //プロフィール情報集計
      let line_over_time = oneday_after_out_work_time; //シフト外残業時間(残業内の休憩時間を集計しない不具合を修正)
      let line_shift_time = 0; //シフト合計
      let line_scheduled_work_time = 0; //所定労働時間
      let line_legal_inner_over_time = 0; //法定内残業時間(法定休日以外の日にて　((A+B)-シフト合計))
      let line_absence_time = 0; //全日欠勤
      let line_absence_not_all_day_time = 0; //欠勤
      let line_late_fast_time = 0; //遅刻早退
      let line_late_start_time = 0; //遅刻
      let line_fast_end_time = 0; //早退
      let line_late_start_omit_break_time = 0; //遅刻_休憩シフトを引く
      let line_fast_end_omit_break_time = 0; //早退_休憩シフトを引く
      let line_before_over_work_time = 0; //前残業

      let line_normal_holiday_work_time = 0; //所定休日労働

      /////////////////////////
      //分数単位
      //休暇消化時間(集計月)
      let line_yuuQ_time = 0; //有休消化時間
      let line_furiQ_time = 0; //振休消化時間
      let line_daiQ_time = 0; //代休消化時間

      //休暇付与時間(集計月)
      let line_yuuQ_in_time = 0; //有休付与時間
      let line_furiQ_in_time = 0; //振休付与時間
      let line_daiQ_in_time = 0; //代休付与時間

      //////////////////////////
      //日数単位
      //休暇消化時間(集計月)
      let line_yuuQ_time_half_day_unit = 0; //有休消化時間
      let line_furiQ_time_half_day_unit = 0; //振休消化時間
      let line_daiQ_time_half_day_unit = 0; //代休消化時間

      //休暇付与時間(集計月)
      let line_yuuQ_in_time_half_day_unit = 0; //有休付与時間
      let line_furiQ_in_time_half_day_unit = 0; //振休付与時間
      let line_daiQ_in_time_half_day_unit = 0; //代休付与時間
      //////////////////////////

      //勤務日数
      if (Number(obj["work_time"]) > 0) {
        pro_work_day_number++; //出勤数カウント(勤務時間の実績がある日をカウント)
      }
      if (Number(obj["holiday_type"]) == 2 && Number(obj["work_time"]) > 0) {
        pro_holiday_work_number++; //休日出勤数カウント(法休で勤務時間がある日をカウント)
      }
      if (Number(obj["yuuQ"]) < 0) {
        pro_vac_day_number++; //有休取得日カウント(有休取得判定がある日をカウント)
      }
      if (
        Number(obj["yuuQ"]) < 0 &&
        obj["plan_start"] == "" &&
        obj["plan_end"] == ""
      ) {
        pro_yuuQ_all_day_number++; //全日有給取得日カウント(有休取得判定があり、シフトがない日をカウント)
      }

      let plan_break_total_time = 0; //シフト内休憩時間合計
      for (let p_breaktime_obj of obj["data"]["plan_breaktime"]) {
        if (moment(p_breaktime_obj["end"]) < moment(obj["plan_end"])) {
          //残業中の休憩は省く
          plan_break_total_time =
            plan_break_total_time + Number(p_breaktime_obj["total_time"]);
        }
      }

      let plan_work_time = 0; //シフト勤務時間
      if (obj["plan_start"] != "" && obj["plan_end"] != "") {
        plan_work_time =
          Math.floor(
            (moment(obj["plan_end"]) - moment(obj["plan_start"])) / 60 / 1000
          ) - Number(plan_break_total_time);
        line_shift_time = plan_work_time;
      } //シフト合計

      //所定労働時間の集計
      line_scheduled_work_time = plan_work_time;
      if (line_request_data["holiday_work"]) {
        line_scheduled_work_time = 0;
      } //休日出勤日は代休振休ともに集計に入れない
      if (line_request_data["vac"]) {
        //休日・休暇日は有給代休振休ともに休暇消化時間を集計に入れる
        for (let q_log_obj of res["Q_log"]["tg_month_Q_breakdown"]) {
          if (res["holiday_unit_type"] == 0) {
            //分数単位
            if (q_log_obj["out_date"] == obj["date"]) {
              if (q_log_obj["type"] == 1) {
                line_scheduled_work_time += -Number(q_log_obj["value"]);
              } //有休消化
              if (q_log_obj["type"] == 2) {
                line_scheduled_work_time += -Number(q_log_obj["value"]);
              } //振休消化
              if (q_log_obj["type"] == 3) {
                line_scheduled_work_time += -Number(q_log_obj["value"]);
              } //代休消化
            }
          } else if (res["holiday_unit_type"] == 1) {
            //日数単位
            if (q_log_obj["out_date"] == obj["date"]) {
              if (q_log_obj["type"] == 1) {
                line_scheduled_work_time +=
                  (-Number(q_log_obj["half_day_value"]) / 2) *
                  Number(res["user_data"]["workminutes_per_day"]);
              } //有休消化
              if (q_log_obj["type"] == 2) {
                line_scheduled_work_time +=
                  (-Number(q_log_obj["half_day_value"]) / 2) *
                  Number(res["user_data"]["workminutes_per_day"]);
              } //振休消化
              if (q_log_obj["type"] == 3) {
                line_scheduled_work_time +=
                  (-Number(q_log_obj["half_day_value"]) / 2) *
                  Number(res["user_data"]["workminutes_per_day"]);
              } //代休消化
            }
          }
        }
      }

      if (Number(obj["holiday_type"]) != 2) {
        line_legal_inner_over_time = Math.max(
          oneday_payroll_nomal +
            oneday_payroll_midnight_nomal -
            (oneday_payroll_nomal +
              oneday_payroll_midnight_nomal +
              oneday_payroll_over +
              oneday_payroll_midnight_over +
              oneday_payroll_holiday +
              oneday_payroll_midnight_holiday -
              line_over_time),
          0
        ); //値がマイナスになってしまう場合は0にしておく
      } //法定内残業
      //console.log("法定内残業確認",obj["date"],"法定内残業",line_legal_inner_over_time,"A+B",oneday_payroll_nomal + oneday_payroll_midnight_nomal,"シフト合計",plan_work_time);

      if (moment(moment().format("YYYY-MM-DD")) > moment(obj["date"])) {
        //今日(出力日)以降の日付は集計しない
        if (
          obj["plan_start"] != "" &&
          obj["plan_end"] != "" &&
          Number(obj["work_time"]) == 0
        ) {
          pro_absence_number++; //全日欠勤日カウント(その日が過ぎているうちでシフトがあるが勤務時間実績がない日をカウント)
          line_absence_time = plan_work_time; //全日欠勤したぶんの時間をシフトから計算
        }
        line_absence_not_all_day_time = Math.max(
          plan_work_time - Number(obj["work_time"]),
          0
        ); //欠勤したぶんの時間をシフトから計算
        //console.log("欠勤集計確認",obj["date"],obj["work_time"],plan_work_time,line_absence_not_all_day_time);
      }

      if (
        Number(obj["holiday_type"]) > 0 &&
        Number(obj["yuuQ"]) == 0 &&
        Number(obj["furiQ"]) == 0 &&
        Number(obj["daiQ"]) == 0
      ) {
        pro_holiday_number++; //休暇日カウント(所休、法休判定がある日で有休、振休、代休それぞれ付与も取得もしていないものをカウント)
      }
      if (Number(obj["bad_start"]) > 0 || Number(obj["bad_end"]) > 0) {
        pro_late_fast_number++; //遅刻、早退日カウント(遅刻、早退判定がある日をカウント)
      }
      if (Number(obj["bad_start"]) > 0) {
        pro_late_start_number++;
      } //遅刻がある日をカウント
      if (Number(obj["bad_end"]) > 0) {
        pro_fast_end_number++;
      } //早退がある日をカウント

      if (
        Number(obj["holiday_type"]) == 1 &&
        Number(obj["yuuQ"]) == 0 &&
        Number(obj["furiQ"]) == 0 &&
        Number(obj["daiQ"]) == 0
      ) {
        pro_normal_holiday_number++;
      } //所定休日日数
      if (
        Number(obj["holiday_type"]) == 2 &&
        Number(obj["yuuQ"]) == 0 &&
        Number(obj["furiQ"]) == 0 &&
        Number(obj["daiQ"]) == 0
      ) {
        pro_legal_holiday_number++;
      } //法定休日日数

      if (obj["bad_start"] == 1) {
        if (obj["result_start"] != "" && obj["plan_start"] != "") {
          line_late_start_time = Math.max(
            Math.floor(
              (moment(obj["result_start"]) - moment(obj["plan_start"])) / 60000
            ),
            0
          ); //値がマイナスになってしまう場合は0にしておく

          //休憩シフトを省いた遅刻集計
          line_late_start_omit_break_time = line_late_start_time;
          if(moment(obj["plan_start"]) < moment(obj["result_start"])){
            for(let planBreakObj  of obj["data"]["plan_breaktime"]){
              //console.log("休憩シフト",planBreakObj);
              if( (moment(obj["plan_start"]) <= moment(planBreakObj["start"])) && (moment(planBreakObj["end"]) <= moment(obj["result_start"])) ){
                //console.log("休憩全て除外");
                line_late_start_omit_break_time = line_late_start_omit_break_time - planBreakObj["total_time"];
              } else if( (moment(obj["plan_start"]) < moment(planBreakObj["start"])) && (moment(planBreakObj["start"]) < moment(obj["result_start"])) && (moment(obj["result_start"]) < moment(planBreakObj["end"])) ){
                //console.log("休憩一部除外");
                line_late_start_omit_break_time = 
                line_late_start_omit_break_time 
                - Math.floor(
                  (moment(obj["result_start"]) - moment(planBreakObj["start"])) / 60 / 1000
                );
              }
            }

          }
        }
      }
      if (obj["bad_end"] == 1) {
        if (obj["result_end"] != "" && obj["plan_end"] != "") {
          line_fast_end_time = Math.max(
            Math.floor(
              (moment(obj["plan_end"]) - moment(obj["result_end"])) / 60000
            ),
            0
          ); //値がマイナスになってしまう場合は0にしておく

          //休憩シフトを省いた早退集計
          line_fast_end_omit_break_time = line_fast_end_time;
          if(moment(obj["result_end"]) < moment(obj["plan_end"])){
            for(let planBreakObj  of obj["data"]["plan_breaktime"]){
              //console.log("休憩シフト",planBreakObj);
              if( (moment(obj["result_end"]) <= moment(planBreakObj["start"])) && (moment(planBreakObj["end"]) <= moment(obj["plan_end"])) ){
                //console.log("休憩全て除外");
                line_fast_end_omit_break_time = line_fast_end_omit_break_time - planBreakObj["total_time"];
              } else if( (moment(planBreakObj["start"]) < moment(obj["result_end"])) && (moment(obj["result_end"]) < moment(planBreakObj["end"])) && (moment(planBreakObj["end"]) < moment(obj["plan_end"])) ){
                //console.log("休憩一部除外");
                line_fast_end_omit_break_time = 
                line_fast_end_omit_break_time
                - Math.floor(
                  (moment(planBreakObj["end"]) - moment(obj["result_end"])) / 60 / 1000
                );
              }
            }

          }
        }
      }

      if (
        obj["result_end"] != "" &&
        obj["plan_end"] != "" &&
        obj["result_end"] != "" &&
        obj["plan_end"] != ""
      ) {
        line_before_over_work_time = Math.max(
          Math.floor(
            (moment(obj["plan_start"]) - moment(obj["result_start"])) / 60000
          ),
          0
        ); //値がマイナスになってしまう場合は0にしておく
      }
      //console.log(obj["date"] + " 一日毎前残業",line_before_over_work_time);

      ////////////////////////////////
      //holiday_logsをもとに表示月休暇消化数を集計

      for (let q_log_obj of res["Q_log"]["tg_month_Q_breakdown"]) {
        if (res["holiday_unit_type"] == 0) {
          //分数単位
          if (q_log_obj["out_date"] == obj["date"]) {
            //console.log("休暇消化",obj["date"],q_log_obj["type"],q_log_obj["value"]);
            if (q_log_obj["type"] == 1) {
              line_yuuQ_time += -Number(q_log_obj["value"]);
            } //有休消化
            if (q_log_obj["type"] == 2) {
              line_furiQ_time += -Number(q_log_obj["value"]);
            } //振休消化
            if (q_log_obj["type"] == 3) {
              line_daiQ_time += -Number(q_log_obj["value"]);
            } //代休消化
          }
          if (
            q_log_obj["in_date"] == obj["date"] &&
            q_log_obj["out_date"] == ""
          ) {
            //console.log("休暇付与",obj["date"],q_log_obj["type"],q_log_obj["value"]);
            if (q_log_obj["type"] == 1) {
              line_yuuQ_in_time += Number(q_log_obj["value"]);
            } //有休付与
            if (q_log_obj["type"] == 2) {
              line_furiQ_in_time += Number(q_log_obj["value"]);
            } //振休付与
            if (q_log_obj["type"] == 3) {
              line_daiQ_in_time += Number(q_log_obj["value"]);
            } //代休付与
          }
        } else if (res["holiday_unit_type"] == 1) {
          //日数単位
          if (q_log_obj["out_date"] == obj["date"]) {
            if (q_log_obj["type"] == 1) {
              line_yuuQ_time_half_day_unit += -Number(
                q_log_obj["half_day_value"]
              );
            } //有休消化
            if (q_log_obj["type"] == 2) {
              line_furiQ_time_half_day_unit += -Number(
                q_log_obj["half_day_value"]
              );
            } //振休消化
            if (q_log_obj["type"] == 3) {
              line_daiQ_time_half_day_unit += -Number(
                q_log_obj["half_day_value"]
              );
            } //代休消化
          }
          if (
            q_log_obj["in_date"] == obj["date"] &&
            q_log_obj["out_date"] == ""
          ) {
            if (q_log_obj["type"] == 1) {
              line_yuuQ_in_time_half_day_unit += Number(
                q_log_obj["half_day_value"]
              );
            } //有休付与
            if (q_log_obj["type"] == 2) {
              line_furiQ_in_time_half_day_unit += Number(
                q_log_obj["half_day_value"]
              );
            } //振休付与
            if (q_log_obj["type"] == 3) {
              line_daiQ_in_time_half_day_unit += Number(
                q_log_obj["half_day_value"]
              );
            } //代休付与
          }
        }
      }
      ////////////////////////////////

      //6_19追記(時間丸め系処理)

      ////////////////////////
      //        設定メモ
      //
      //        例
      //        "rounding_time":"10_d_r"
      //        10_d_f  30_m_c
      //
      //        丸めなし
      //        "none"
      //
      //        丸め対象期間
      //        d:一日ごとに
      //        m:月ごとに
      //
      //        丸めかた
      //        r:四捨五入(round)
      //        c:切り上げ(ceil)
      //        f:切り捨て(floor)
      ////////////////////////

      ///////
      //デバック用
      //res["user_data"]["rounding_time"] = "none";
      //res["user_data"]["rounding_time"] = "30_d_r";
      ///////
      ////////////////
      //一日ごと時間丸め処理
      //新丸め設定
      if (
        res["user_data"]["rounding_times"] != null &&
        res["user_data"]["rounding_times"] != ""
      ) {
        if (
          res["user_data"]["rounding_times"]["all"] != null &&
          res["user_data"]["rounding_times"]["all"] != ""
        ) {
          if (res["user_data"]["rounding_times"]["all"] != "none") {
            var rounding_option =
              res["user_data"]["rounding_times"]["all"].split("_");
            if (rounding_option[1] == "d") {
              if (rounding_option[2] == "r") {
                //一日ごと集計丸め
                //line_break_time =
                //  Math.round(line_break_time / Number(rounding_option[0])) * Number(rounding_option[0]); //休憩時間:四捨五入
                line_over_time =
                  Math.round(line_over_time / Number(rounding_option[0])) *
                  Number(rounding_option[0]); //残業時間:四捨五入
                line_absence_time =
                  Math.round(line_absence_time / Number(rounding_option[0])) *
                  Number(rounding_option[0]); //全日欠勤:四捨五入
                line_absence_not_all_day_time =
                  Math.round(
                    line_absence_not_all_day_time / Number(rounding_option[0])
                  ) * Number(rounding_option[0]); //欠勤:四捨五入
                line_shift_time =
                  Math.round(line_shift_time / Number(rounding_option[0])) *
                  Number(rounding_option[0]); //シフト合計:四捨五入
                line_scheduled_work_time =
                  Math.round(
                    line_scheduled_work_time / Number(rounding_option[0])
                  ) * Number(rounding_option[0]); //所定労働時間:四捨五入
                line_late_start_time =
                  Math.round(
                    line_late_start_time / Number(rounding_option[0])
                  ) * Number(rounding_option[0]); //遅刻:四捨五入
                line_fast_end_time =
                  Math.round(line_fast_end_time / Number(rounding_option[0])) *
                  Number(rounding_option[0]); //早退:四捨五入
                line_late_start_omit_break_time =
                  Math.round(
                    line_late_start_omit_break_time / Number(rounding_option[0])
                  ) * Number(rounding_option[0]); //遅刻(休憩シフト除外):四捨五入
                line_fast_end_omit_break_time =
                  Math.round(line_fast_end_omit_break_time / Number(rounding_option[0])) *
                  Number(rounding_option[0]); //早退(休憩シフト除外):四捨五入
                line_before_over_work_time =
                  Math.round(
                    line_before_over_work_time / Number(rounding_option[0])
                  ) * Number(rounding_option[0]); //前残業:四捨五入
                line_legal_inner_over_time =
                  Math.round(
                    line_legal_inner_over_time / Number(rounding_option[0])
                  ) * Number(rounding_option[0]); //法定内残業時間:四捨五入
                  line_actual_work_time =
                  Math.round(
                    line_actual_work_time / Number(rounding_option[0])
                  ) * Number(rounding_option[0]); //打刻時間:四捨五入
                //給与計算用集計
                payroll_nomal =
                  Math.round(payroll_nomal / Number(rounding_option[0])) *
                  Number(rounding_option[0]); //A: 日中_通常:四捨五入
                payroll_midnight_nomal =
                  Math.round(
                    payroll_midnight_nomal / Number(rounding_option[0])
                  ) * Number(rounding_option[0]); //B: 深夜_通常:四捨五入
                payroll_over =
                  Math.round(payroll_over / Number(rounding_option[0])) *
                  Number(rounding_option[0]); //C: 日中_残業:四捨五入
                payroll_midnight_over =
                  Math.round(
                    payroll_midnight_over / Number(rounding_option[0])
                  ) * Number(rounding_option[0]); //D: 深夜_残業:四捨五入
                payroll_holiday =
                  Math.round(payroll_holiday / Number(rounding_option[0])) *
                  Number(rounding_option[0]); //E: 日中_休日:四捨五入
                payroll_midnight_holiday =
                  Math.round(
                    payroll_midnight_holiday / Number(rounding_option[0])
                  ) * Number(rounding_option[0]); //F: 深夜_休日:四捨五入
                //一日ごとの給与計算用集計
                oneday_payroll_nomal =
                  Math.round(
                    oneday_payroll_nomal / Number(rounding_option[0])
                  ) * Number(rounding_option[0]); //A: 日中_通常:四捨五入
                oneday_payroll_midnight_nomal =
                  Math.round(
                    oneday_payroll_midnight_nomal / Number(rounding_option[0])
                  ) * Number(rounding_option[0]); //B: 深夜_通常:四捨五入
                oneday_payroll_over =
                  Math.round(oneday_payroll_over / Number(rounding_option[0])) *
                  Number(rounding_option[0]); //C: 日中_残業:四捨五入
                oneday_payroll_midnight_over =
                  Math.round(
                    oneday_payroll_midnight_over / Number(rounding_option[0])
                  ) * Number(rounding_option[0]); //D: 深夜_残業:四捨五入
                oneday_payroll_holiday =
                  Math.round(
                    oneday_payroll_holiday / Number(rounding_option[0])
                  ) * Number(rounding_option[0]); //E: 日中_休日:四捨五入
                oneday_payroll_midnight_holiday =
                  Math.round(
                    oneday_payroll_midnight_holiday / Number(rounding_option[0])
                  ) * Number(rounding_option[0]); //F: 深夜_休日:四捨五入
                oneday_payroll_over_60_hour =
                  Math.round(oneday_payroll_over_60_hour / Number(rounding_option[0])) *
                  Number(rounding_option[0]); //C': 日中_残業60時間以上:四捨五入
                oneday_payroll_midnight_over_60_hour =
                  Math.round(
                    oneday_payroll_midnight_over_60_hour / Number(rounding_option[0])
                  ) * Number(rounding_option[0]); //D': 深夜_残業60時間以上:四捨五入
                //カスタム集計
                custom_onday_payroll.forEach(function (_, c_o_p_i) {
                  custom_onday_payroll[c_o_p_i]["agg_result"] =
                    Math.round(
                      custom_onday_payroll[c_o_p_i]["agg_result"] /
                        Number(rounding_option[0])
                    ) * Number(rounding_option[0]);
                });
                //日報ラベル集計
                for (let report_label_breakdown of line_report_label_data) {
                  report_label_breakdown["total_time"] =
                    Math.round(
                      report_label_breakdown["total_time"] /
                        Number(rounding_option[0])
                    ) * Number(rounding_option[0]);
                  //console.log("日毎四捨五入ループ確認",obj["date"],report_label_breakdown["total_time"]);
                  //日別ではなく業務ごとに丸めているので注意
                }
              } else if (rounding_option[2] == "c") {
                //一日ごと集計丸め
                //line_break_time =
                //  Math.ceil(line_break_time / Number(rounding_option[0])) * Number(rounding_option[0]); //休憩時間:切り上げ
                line_over_time =
                  Math.ceil(line_over_time / Number(rounding_option[0])) *
                  Number(rounding_option[0]); //残業時間:切り上げ
                line_absence_time =
                  Math.ceil(line_absence_time / Number(rounding_option[0])) *
                  Number(rounding_option[0]); //全日欠勤:切り上げ
                line_absence_not_all_day_time =
                  Math.ceil(
                    line_absence_not_all_day_time / Number(rounding_option[0])
                  ) * Number(rounding_option[0]); //欠勤:切り上げ
                line_shift_time =
                  Math.ceil(line_shift_time / Number(rounding_option[0])) *
                  Number(rounding_option[0]); //シフト合計:切り上げ
                line_scheduled_work_time =
                  Math.ceil(
                    line_scheduled_work_time / Number(rounding_option[0])
                  ) * Number(rounding_option[0]); //所定労働時間:切り上げ
                line_late_start_time =
                  Math.ceil(line_late_start_time / Number(rounding_option[0])) *
                  Number(rounding_option[0]); //遅刻:切り上げ
                line_fast_end_time =
                  Math.ceil(line_fast_end_time / Number(rounding_option[0])) *
                  Number(rounding_option[0]); //早退:切り上げ
                line_late_start_omit_break_time =
                  Math.ceil(
                    line_late_start_omit_break_time / Number(rounding_option[0])
                  ) * Number(rounding_option[0]); //遅刻(休憩シフト除外):切り上げ
                line_fast_end_omit_break_time =
                  Math.ceil(line_fast_end_omit_break_time / Number(rounding_option[0])) *
                  Number(rounding_option[0]); //早退(休憩シフト除外):切り上げ
                line_before_over_work_time =
                  Math.ceil(
                    line_before_over_work_time / Number(rounding_option[0])
                  ) * Number(rounding_option[0]); //前残業:切り上げ
                line_legal_inner_over_time =
                  Math.ceil(
                    line_legal_inner_over_time / Number(rounding_option[0])
                  ) * Number(rounding_option[0]); //法定内残業時間:切り上げ
                line_actual_work_time =
                  Math.ceil(
                    line_actual_work_time / Number(rounding_option[0])
                  ) * Number(rounding_option[0]); //打刻時間:切り上げ
                //給与計算用集計
                payroll_nomal =
                  Math.ceil(payroll_nomal / Number(rounding_option[0])) *
                  Number(rounding_option[0]); //A: 日中_通常:切り上げ
                payroll_midnight_nomal =
                  Math.ceil(
                    payroll_midnight_nomal / Number(rounding_option[0])
                  ) * Number(rounding_option[0]); //B: 深夜_通常:切り上げ
                payroll_over =
                  Math.ceil(payroll_over / Number(rounding_option[0])) *
                  Number(rounding_option[0]); //C: 日中_残業:切り上げ
                payroll_midnight_over =
                  Math.ceil(
                    payroll_midnight_over / Number(rounding_option[0])
                  ) * Number(rounding_option[0]); //D: 深夜_残業:切り上げ
                payroll_holiday =
                  Math.ceil(payroll_holiday / Number(rounding_option[0])) *
                  Number(rounding_option[0]); //E: 日中_休日:切り上げ
                payroll_midnight_holiday =
                  Math.ceil(
                    payroll_midnight_holiday / Number(rounding_option[0])
                  ) * Number(rounding_option[0]); //F: 深夜_休日:切り上げ
                //一日ごとの給与計算用集計
                oneday_payroll_nomal =
                  Math.ceil(oneday_payroll_nomal / Number(rounding_option[0])) *
                  Number(rounding_option[0]); //A: 日中_通常:切り上げ
                oneday_payroll_midnight_nomal =
                  Math.ceil(
                    oneday_payroll_midnight_nomal / Number(rounding_option[0])
                  ) * Number(rounding_option[0]); //B: 深夜_通常:切り上げ
                oneday_payroll_over =
                  Math.ceil(oneday_payroll_over / Number(rounding_option[0])) *
                  Number(rounding_option[0]); //C: 日中_残業:切り上げ
                oneday_payroll_midnight_over =
                  Math.ceil(
                    oneday_payroll_midnight_over / Number(rounding_option[0])
                  ) * Number(rounding_option[0]); //D: 深夜_残業:切り上げ
                oneday_payroll_holiday =
                  Math.ceil(
                    oneday_payroll_holiday / Number(rounding_option[0])
                  ) * Number(rounding_option[0]); //E: 日中_休日:切り上げ
                oneday_payroll_midnight_holiday =
                  Math.ceil(
                    oneday_payroll_midnight_holiday / Number(rounding_option[0])
                  ) * Number(rounding_option[0]); //F: 深夜_休日:切り上げ
                oneday_payroll_over_60_hour =
                  Math.ceil(oneday_payroll_over_60_hour / Number(rounding_option[0])) *
                  Number(rounding_option[0]); //C': 日中_残業60時間以上:切り上げ
                oneday_payroll_midnight_over_60_hour =
                  Math.ceil(
                    oneday_payroll_midnight_over_60_hour / Number(rounding_option[0])
                  ) * Number(rounding_option[0]); //D': 深夜_残業60時間以上:切り上げ
                //カスタム集計
                custom_onday_payroll.forEach(function (_, c_o_p_i) {
                  custom_onday_payroll[c_o_p_i]["agg_result"] =
                    Math.ceil(
                      custom_onday_payroll[c_o_p_i]["agg_result"] /
                        Number(rounding_option[0])
                    ) * Number(rounding_option[0]);
                });
                //日報ラベル集計
                for (let report_label_breakdown of line_report_label_data) {
                  report_label_breakdown["total_time"] =
                    Math.ceil(
                      report_label_breakdown["total_time"] /
                        Number(rounding_option[0])
                    ) * Number(rounding_option[0]);
                  //console.log("日毎切り上げループ確認",obj["date"],report_label_breakdown["total_time"]);
                  //日別ではなく業務ごとに丸めているので注意
                }
              } else if (rounding_option[2] == "f") {
                //一日ごと集計丸め
                //line_break_time =
                //  Math.floor(line_break_time / Number(rounding_option[0])) * Number(rounding_option[0]); //休憩時間:切り捨て
                line_over_time =
                  Math.floor(line_over_time / Number(rounding_option[0])) *
                  Number(rounding_option[0]); //残業時間:切り捨て
                line_absence_time =
                  Math.floor(line_absence_time / Number(rounding_option[0])) *
                  Number(rounding_option[0]); //全日欠勤:切り捨て
                line_absence_not_all_day_time =
                  Math.floor(
                    line_absence_not_all_day_time / Number(rounding_option[0])
                  ) * Number(rounding_option[0]); //欠勤:切り捨て
                line_shift_time =
                  Math.floor(line_shift_time / Number(rounding_option[0])) *
                  Number(rounding_option[0]); //シフト合計:切り捨て
                line_scheduled_work_time =
                  Math.floor(
                    line_scheduled_work_time / Number(rounding_option[0])
                  ) * Number(rounding_option[0]); //所定労働時間:切り捨て
                line_late_start_time =
                  Math.floor(
                    line_late_start_time / Number(rounding_option[0])
                  ) * Number(rounding_option[0]); //遅刻:切り捨て
                line_fast_end_time =
                  Math.floor(line_fast_end_time / Number(rounding_option[0])) *
                  Number(rounding_option[0]); //早退:切り捨て
                line_late_start_omit_break_time =
                  Math.floor(
                    line_late_start_omit_break_time / Number(rounding_option[0])
                  ) * Number(rounding_option[0]); //遅刻(休憩シフト除外):切り捨て
                line_fast_end_omit_break_time =
                  Math.floor(line_fast_end_omit_break_time / Number(rounding_option[0])) *
                  Number(rounding_option[0]); //早退(休憩シフト除外):切り捨て
                line_before_over_work_time =
                  Math.floor(
                    line_before_over_work_time / Number(rounding_option[0])
                  ) * Number(rounding_option[0]); //前残業:切り捨て
                line_legal_inner_over_time =
                  Math.floor(
                    line_legal_inner_over_time / Number(rounding_option[0])
                  ) * Number(rounding_option[0]); //法定内残業時間:切り捨て
                line_actual_work_time =
                  Math.floor(
                    line_actual_work_time / Number(rounding_option[0])
                  ) * Number(rounding_option[0]); //打刻時間:切り捨て
                //給与計算用集計
                payroll_nomal =
                  Math.floor(payroll_nomal / Number(rounding_option[0])) *
                  Number(rounding_option[0]); //A: 日中_通常:切り捨て
                payroll_midnight_nomal =
                  Math.floor(
                    payroll_midnight_nomal / Number(rounding_option[0])
                  ) * Number(rounding_option[0]); //B: 深夜_通常:切り捨て
                payroll_over =
                  Math.floor(payroll_over / Number(rounding_option[0])) *
                  Number(rounding_option[0]); //C: 日中_残業:切り捨て
                payroll_midnight_over =
                  Math.floor(
                    payroll_midnight_over / Number(rounding_option[0])
                  ) * Number(rounding_option[0]); //D: 深夜_残業:切り捨て
                payroll_holiday =
                  Math.floor(payroll_holiday / Number(rounding_option[0])) *
                  Number(rounding_option[0]); //E: 日中_休日:切り捨て
                payroll_midnight_holiday =
                  Math.floor(
                    payroll_midnight_holiday / Number(rounding_option[0])
                  ) * Number(rounding_option[0]); //F: 深夜_休日:切り捨て
                //一日ごとの給与計算用集計
                oneday_payroll_nomal =
                  Math.floor(
                    oneday_payroll_nomal / Number(rounding_option[0])
                  ) * Number(rounding_option[0]); //A: 日中_通常:切り捨て
                oneday_payroll_midnight_nomal =
                  Math.floor(
                    oneday_payroll_midnight_nomal / Number(rounding_option[0])
                  ) * Number(rounding_option[0]); //B: 深夜_通常:切り捨て
                oneday_payroll_over =
                  Math.floor(oneday_payroll_over / Number(rounding_option[0])) *
                  Number(rounding_option[0]); //C: 日中_残業:切り捨て
                oneday_payroll_midnight_over =
                  Math.floor(
                    oneday_payroll_midnight_over / Number(rounding_option[0])
                  ) * Number(rounding_option[0]); //D: 深夜_残業:切り捨て
                oneday_payroll_holiday =
                  Math.floor(
                    oneday_payroll_holiday / Number(rounding_option[0])
                  ) * Number(rounding_option[0]); //E: 日中_休日:切り捨て
                oneday_payroll_midnight_holiday =
                  Math.floor(
                    oneday_payroll_midnight_holiday / Number(rounding_option[0])
                  ) * Number(rounding_option[0]); //F: 深夜_休日:切り捨て
                oneday_payroll_over_60_hour =
                  Math.floor(oneday_payroll_over_60_hour / Number(rounding_option[0])) *
                  Number(rounding_option[0]); //C': 日中_残業60時間以上:切り捨て
                oneday_payroll_midnight_over_60_hour =
                  Math.floor(
                    oneday_payroll_midnight_over_60_hour / Number(rounding_option[0])
                  ) * Number(rounding_option[0]); //D': 深夜_残業60時間以上:切り捨て
                //カスタム集計
                custom_onday_payroll.forEach(function (_, c_o_p_i) {
                  custom_onday_payroll[c_o_p_i]["agg_result"] =
                    Math.floor(
                      custom_onday_payroll[c_o_p_i]["agg_result"] /
                        Number(rounding_option[0])
                    ) * Number(rounding_option[0]);
                });
                //日報ラベル集計
                for (let report_label_breakdown of line_report_label_data) {
                  report_label_breakdown["total_time"] =
                    Math.floor(
                      report_label_breakdown["total_time"] /
                        Number(rounding_option[0])
                    ) * Number(rounding_option[0]);
                  //console.log("日毎切り捨てループ確認",obj["date"],report_label_breakdown["total_time"]);
                  //日別ではなく業務ごとに丸めているので注意
                }
              }
            }
          }
        }
      }

      if (Number(obj["holiday_type"]) == 1) {
        line_normal_holiday_work_time =
          oneday_payroll_nomal +
          oneday_payroll_midnight_nomal +
          oneday_payroll_over +
          oneday_payroll_midnight_over; //勤務時間(A~D)
      } //所定休日労働(この項目は日跨ぎ部分の判定はしていないため注意)
      ////////////////
      pro_break_time += line_break_time; //休憩合計
      pro_shift_time += line_shift_time; //シフト合計
      pro_scheduled_work_time += line_scheduled_work_time; //所定労働時間
      works.over += line_over_time; //シフト外残業時間
      pro_legal_inner_works_over += line_legal_inner_over_time; //法定内残業時間(法定休日以外の日にて　((A+B)-シフト合計))
      pro_absence_time += line_absence_time; //全日欠勤
      pro_absence_not_all_day_time += line_absence_not_all_day_time; //欠勤
      pro_late_start_time += line_late_start_time; //遅刻
      pro_fast_end_time += line_fast_end_time; //早退
      pro_late_start_omit_break_time += line_late_start_omit_break_time; //遅刻_休憩シフトを引く
      pro_fast_end_omit_break_time += line_fast_end_omit_break_time; //早退_休憩シフトを引く
      pro_before_over_work_time += line_before_over_work_time; //前残業
      //console.log(obj["date"] + " 合計前残業",pro_before_over_work_time);
      pro_normal_holiday_work_time += line_normal_holiday_work_time; //所定休日労働

      pro_actual_work_time += line_actual_work_time; //打刻時間

      //分数単位
      //休暇消化時間(集計月)
      yuuQ_time = yuuQ_time + line_yuuQ_time; //有休消化時間
      furiQ_time = furiQ_time + line_furiQ_time; //振休消化時間
      daiQ_time = daiQ_time + line_daiQ_time; //代休消化時間
      //休暇付与時間(集計月)
      yuuQ_in_time = yuuQ_in_time + line_yuuQ_in_time; //有休付与時間
      furiQ_in_time = furiQ_in_time + line_furiQ_in_time; //振休付与時間
      daiQ_in_time = daiQ_in_time + line_daiQ_in_time; //代休付与時間

      //日数単位
      //休暇消化時間(集計月)
      yuuQ_time_half_day_unit =
        yuuQ_time_half_day_unit + line_yuuQ_time_half_day_unit; //有休消化時間
      furiQ_time_half_day_unit =
        furiQ_time_half_day_unit + line_furiQ_time_half_day_unit; //振休消化時間
      daiQ_time_half_day_unit =
        daiQ_time_half_day_unit + line_daiQ_time_half_day_unit; //代休消化時間
      //休暇付与時間(集計月)
      yuuQ_in_time_half_day_unit =
        yuuQ_in_time_half_day_unit + line_yuuQ_in_time_half_day_unit; //有休付与時間
      furiQ_in_time_half_day_unit =
        furiQ_in_time_half_day_unit + line_furiQ_in_time_half_day_unit; //振休付与時間
      daiQ_in_time_half_day_unit =
        daiQ_in_time_half_day_unit + line_daiQ_in_time_half_day_unit; //代休付与時間

      let line_shift_patten_name = "-";
      let line_shift_patten_color = "";
      if (obj["data"]["custom_shift"] != null) {
        line_shift_patten_name = obj["data"]["custom_shift"]["name"];
        line_shift_patten_color = obj["data"]["custom_shift"]["color"];
      } else {
        line_shift_patten_name = obj["data"]["default_shift"]["name"];
        line_shift_patten_color = obj["data"]["default_shift"]["color"];
      }

      let line_work_time =
        oneday_payroll_nomal +
        oneday_payroll_midnight_nomal +
        oneday_payroll_over +
        oneday_payroll_midnight_over +
        oneday_payroll_holiday +
        oneday_payroll_midnight_holiday; //勤務時間(A~F)
      let line_shift_over_work_time = Math.max(
        line_work_time - line_shift_time,
        0
      ); //値がマイナスになってしまう場合は0にしておく//残業時間(勤務時間-シフト合計)

      //C'': 日中_残業60時間以内
      oneday_payroll_over_inner_60_hour = oneday_payroll_over - oneday_payroll_over_60_hour;
      //D'': 深夜_残業60時間以内
      oneday_payroll_midnight_over_inner_60_hour = oneday_payroll_midnight_over - oneday_payroll_midnight_over_60_hour;

      let line_legal_over_time =
        oneday_payroll_over + oneday_payroll_midnight_over; //法定外残業時間(C+D)
      let line_legal_over_inner_60_hour_time =
        oneday_payroll_over_inner_60_hour + oneday_payroll_midnight_over_inner_60_hour; //法定外残業時間(C+D)_60時間以内
      let line_legal_over_60_hour_time =
        oneday_payroll_over_60_hour + oneday_payroll_midnight_over_60_hour; //法定外残業時間(C+D)_60時間以上
      let line_deep_night_time =
        oneday_payroll_midnight_nomal +
        oneday_payroll_midnight_over +
        oneday_payroll_midnight_holiday; //深夜労働(B+D+F)
      let line_holiday_work_time =
        oneday_payroll_holiday + oneday_payroll_midnight_holiday; //休日労働(E+F)

      line_late_fast_time = line_late_start_time + line_fast_end_time; //遅刻早退

      pro_shift_over_work_time += line_shift_over_work_time; //残業時間(勤務時間-シフト合計)
      ////////////////////////
      //日報編集
      for (let line_report_breakdown of line_report_label_data) {
        let f = 1;
        for (let aggregated_breakdown of report_label_data) {
          //集計済みのデータを確認し、すでに対象のラベルのデータがあればそこの合計時間に加算
          if (
            aggregated_breakdown["label_id"] ==
            line_report_breakdown["label_id"]
          ) {
            f = 0;
            aggregated_breakdown["total_time"] =
              Number(aggregated_breakdown["total_time"]) +
              Number(line_report_breakdown["total_time"]);
          }
        }
        if (f) {
          //report_label_data.push(line_report_breakdown); //このように連想配列そのものを入れると壊れるので注意
          const array = line_report_breakdown;
          report_label_data.push({
            label_color: array["label_color"],
            label_id: array["label_id"],
            label_name: array["label_name"],
            total_time: array["total_time"],
          });
        } //まだ集計したことのないラベルであればデータを追加
      }
      ////////////////////////

      oneday_breakdown_list.push({
        date: obj["date"], //日付け

        shift_patten_name: line_shift_patten_name,
        shift_patten_color: line_shift_patten_color,

        shift: line_shift, //シフト
        plan_start: obj["plan_start"], //シフト出勤時刻
        plan_end: obj["plan_end"], //シフト退勤時刻
        result: line_result, //実績
        state: line_state, //勤務状況
        group: line_group, //グループ
        work_time: line_work_time, //勤務時間(A~F)
        break_time: line_break_time, //合計休憩時間(分)
        shift_time: line_shift_time, //シフト合計(分)
        scheduled_work_time: line_scheduled_work_time, //所定労働時間(分)
        shift_over_work_time: line_shift_over_work_time, //残業時間(勤務時間-シフト合計)
        over_time: line_over_time, //シフト外残業時間(分)
        legal_inner_over_time: line_legal_inner_over_time, //法定内残業時間(分)
        legal_over_time: line_legal_over_time, //法定外残業時間(C+D)
        legal_over_inner_60_hour_time: line_legal_over_inner_60_hour_time, //法定外残業時間(C+D)_60時間以内
        legal_over_60_hour_time: line_legal_over_60_hour_time, //法定外残業時間(C+D)_60時間以上
        deep_night_time: line_deep_night_time, //深夜労働(B+D+F)
        holiday_work_time: line_holiday_work_time, //休日労働(E+F)
        absence_time: line_absence_time, //全日欠勤
        absence_not_all_day_time: line_absence_not_all_day_time, //欠勤
        late_start_time: line_late_start_time, //遅刻
        fast_end_time: line_fast_end_time, //早退
        late_fast_time: line_late_fast_time, //遅刻早退
        late_start_omit_break_time: line_late_start_omit_break_time, //遅刻_休憩シフトを引く
        fast_end_omit_break_time: line_fast_end_omit_break_time, //早退_休憩シフトを引く
        before_over_work_time: line_before_over_work_time, //前残業
        normal_holiday_work_time: line_normal_holiday_work_time, //所定休日労働
        actual_work_time: line_actual_work_time, //打刻時間

        exday_state: line_exday_state, //特殊日設定

        request_data: line_request_data, //申請内容

        //給与計算用項目(分)
        normal_work_limit: obj["normal_work_limit"], //法定内労働の上限
        payroll_type_breakdown: oneday_payroll_type_breakdown, //グラフ表示用時刻内わけ
        payroll_over_60_hour_breakdown: oneday_payroll_over_60_hour_breakdown, //グラフ表示用残業60時間以上時刻内わけ
        payroll_nomal: oneday_payroll_nomal, //日中_通常(A)
        payroll_midnight_nomal: oneday_payroll_midnight_nomal, //深夜_通常(B)
        payroll_over: oneday_payroll_over, //日中_残業(C)
        payroll_midnight_over: oneday_payroll_midnight_over, //深夜_残業(D)
        payroll_holiday: oneday_payroll_holiday, //日中_休日(E)
        payroll_midnight_holiday: oneday_payroll_midnight_holiday, //深夜_休日(F)
        payroll_over_60_hour: oneday_payroll_over_60_hour, //日中_残業60時間以上(C')
        payroll_midnight_over_60_hour: oneday_payroll_midnight_over_60_hour, //深夜_残業60時間以上(D')
        payroll_over_inner_60_hour: oneday_payroll_over_inner_60_hour, //日中_残業60時間以内(C'')
        payroll_midnight_over_inner_60_hour: oneday_payroll_midnight_over_inner_60_hour, //深夜_残業60時間以内(D'')

        ////////////////////////
        //分数単位
        //休暇消化時間(集計月)
        yuuQ_time: line_yuuQ_time, //有休消化時間
        furiQ_time: line_furiQ_time, //振休消化時間
        daiQ_time: line_daiQ_time, //代休消化時間

        //休暇付与時間(集計月)
        yuuQ_in_time: line_yuuQ_in_time, //有休付与時間
        furiQ_in_time: line_furiQ_in_time, //振休付与時間
        daiQ_in_time: line_daiQ_in_time, //代休付与時間

        ////////////////////////
        //日数単位
        //休暇消化時間(集計月)
        yuuQ_time_half_day_unit: Number(line_yuuQ_time_half_day_unit) / 2, //有休消化時間
        furiQ_time_half_day_unit: Number(line_furiQ_time_half_day_unit) / 2, //振休消化時間
        daiQ_time_half_day_unit: Number(line_daiQ_time_half_day_unit) / 2, //代休消化時間

        //休暇付与時間(集計月)
        yuuQ_in_time_half_day_unit: Number(line_yuuQ_in_time_half_day_unit) / 2, //有休付与時間
        furiQ_in_time_half_day_unit:
          Number(line_furiQ_in_time_half_day_unit) / 2, //振休付与時間
        daiQ_in_time_half_day_unit: Number(line_daiQ_in_time_half_day_unit) / 2, //代休付与時間
        ////////////////////////

        result_review_state: obj["data"]["review_state"], //勤務実績確認状況

        holiday_type: obj["holiday_type"], //休暇種別

        //日報ラベル集計
        report_label_data: line_report_label_data,
      });

      custom_payroll.forEach(function (_, c_p_i) {
        custom_payroll[c_p_i]["agg_result"] =
          custom_payroll[c_p_i]["agg_result"] +
          custom_onday_payroll[c_p_i]["agg_result"];
        custom_payroll[c_p_i]["agg_result_array"].push({
          date: obj["date"],
          number: custom_onday_payroll[c_p_i]["agg_result"],
          breakdown: custom_onday_payroll[c_p_i]["agg_result_array"],
        });
      });
    });

    //6_20追加
    //休日出勤申請必須(シフトなし日集計)設定文字起こし
    var required_shift_option_str = "未設定(集計する)";
    if (res["user_data"]["required_request"] != null) {
      if (res["user_data"]["required_request"]["holiday_work"] == 1) {
        required_shift_option_str = "集計しない";
      } else if (res["user_data"]["required_request"]["holiday_work"] == 0) {
        required_shift_option_str = "集計する";
      }
    }

    /////////////////
    //時間丸め設定文字起こし
    var rounding_option_str = "未設定(丸めなし)";

    //新丸め設定
    if (
      res["user_data"]["rounding_times"] != null &&
      res["user_data"]["rounding_times"] != ""
    ) {
      if (
        res["user_data"]["rounding_times"]["all"] != null &&
        res["user_data"]["rounding_times"]["all"] != ""
      ) {
        if (res["user_data"]["rounding_times"]["all"] == "none") {
          rounding_option_str = "丸めなし";
        } else {
          var rounding_option =
            res["user_data"]["rounding_times"]["all"].split("_");
          var r_op_1 = "エラー"; //丸め単位
          r_op_1 = rounding_option[0];

          var r_op_2 = "エラー"; //丸め期間
          if (rounding_option[1] == "d") {
            r_op_2 = "一日";
          } else if (rounding_option[1] == "m") {
            r_op_2 = "一ヶ月";
          }

          var r_op_3 = "エラー"; //丸め方
          if (rounding_option[2] == "r") {
            r_op_3 = "四捨五入";
          } else if (rounding_option[2] == "c") {
            r_op_3 = "切り上げ";
          } else if (rounding_option[2] == "f") {
            r_op_3 = "切り捨て";
          }

          rounding_option_str = r_op_2 + "毎、" + r_op_1 + "分単位" + r_op_3;
        }
      }
    }
    /////////////////
    //月ごと丸め処理

    if (
      res["user_data"]["rounding_times"] != null &&
      res["user_data"]["rounding_times"] != ""
    ) {
      if (
        res["user_data"]["rounding_times"]["all"] != null &&
        res["user_data"]["rounding_times"]["all"] != ""
      ) {
        if (res["user_data"]["rounding_times"]["all"] != "none") {
          var rounding_option =
            res["user_data"]["rounding_times"]["all"].split("_");
          if (rounding_option[1] == "m") {
            if (rounding_option[2] == "r") {
              pro_absence_time =
                Math.round(pro_absence_time / Number(rounding_option[0])) *
                Number(rounding_option[0]); //全日欠勤:四捨五入
              pro_absence_not_all_day_time =
                Math.round(
                  pro_absence_not_all_day_time / Number(rounding_option[0])
                ) * Number(rounding_option[0]); //欠勤:四捨五入
              pro_shift_time =
                Math.round(pro_shift_time / Number(rounding_option[0])) *
                Number(rounding_option[0]); //シフト合計:四捨五入
              pro_scheduled_work_time =
                Math.round(
                  pro_scheduled_work_time / Number(rounding_option[0])
                ) * Number(rounding_option[0]); //所定労働時間:四捨五入
              pro_shift_over_work_time =
                Math.round(
                  pro_shift_over_work_time / Number(rounding_option[0])
                ) * Number(rounding_option[0]); //残業時間(勤務時間-シフト合計):四捨五入
              works.over =
                Math.round(works.over / Number(rounding_option[0])) *
                Number(rounding_option[0]); //シフト外残業:四捨五入
              pro_late_start_time =
                Math.round(pro_late_start_time / Number(rounding_option[0])) *
                Number(rounding_option[0]); //遅刻:四捨五入
              pro_fast_end_time =
                Math.round(pro_fast_end_time / Number(rounding_option[0])) *
                Number(rounding_option[0]); //早退:四捨五入
              pro_late_start_omit_break_time =
                Math.round(pro_late_start_omit_break_time / Number(rounding_option[0])) *
                Number(rounding_option[0]); //遅刻(休憩シフト除外):四捨五入
              pro_fast_end_omit_break_time =
                Math.round(pro_fast_end_omit_break_time / Number(rounding_option[0])) *
                Number(rounding_option[0]); //早退(休憩シフト除外):四捨五入
              pro_before_over_work_time =
                Math.round(
                  pro_before_over_work_time / Number(rounding_option[0])
                ) * Number(rounding_option[0]); //前残業:四捨五入
              pro_legal_inner_works_over =
                Math.round(
                  pro_legal_inner_works_over / Number(rounding_option[0])
                ) * Number(rounding_option[0]); //法定内残業:四捨五入
              pro_actual_work_time =
                Math.round(
                  pro_actual_work_time / Number(rounding_option[0])
                ) * Number(rounding_option[0]); //打刻時間:四捨五入
              //給与計算用集計
              payroll_nomal =
                Math.round(payroll_nomal / Number(rounding_option[0])) *
                Number(rounding_option[0]); //A: 日中_通常:四捨五入
              payroll_midnight_nomal =
                Math.round(
                  payroll_midnight_nomal / Number(rounding_option[0])
                ) * Number(rounding_option[0]); //B: 深夜_通常:四捨五入
              payroll_over =
                Math.round(payroll_over / Number(rounding_option[0])) *
                Number(rounding_option[0]); //C: 日中_残業:四捨五入
              payroll_midnight_over =
                Math.round(payroll_midnight_over / Number(rounding_option[0])) *
                Number(rounding_option[0]); //D: 深夜_残業:四捨五入
              payroll_holiday =
                Math.round(payroll_holiday / Number(rounding_option[0])) *
                Number(rounding_option[0]); //E: 日中_休日:四捨五入
              payroll_midnight_holiday =
                Math.round(
              payroll_midnight_holiday / Number(rounding_option[0])
                ) * Number(rounding_option[0]); //F: 深夜_休日:四捨五入
              payroll_over_60_hour =
                Math.round(payroll_over_60_hour / Number(rounding_option[0])) *
                Number(rounding_option[0]); //C': 日中_残業60時間以上:四捨五入
              payroll_midnight_over_60_hour =
                Math.round(payroll_midnight_over_60_hour / Number(rounding_option[0])) *
                Number(rounding_option[0]); //D': 深夜_残業60時間以上:四捨五入
              //カスタム集計
              custom_payroll.forEach(function (_, c_o_p_i) {
                custom_payroll[c_o_p_i]["agg_result"] =
                  Math.round(
                    custom_payroll[c_o_p_i]["agg_result"] /
                      Number(rounding_option[0])
                  ) * Number(rounding_option[0]);
              });
              //日報ラベル集計
              for (let report_label_breakdown of report_label_data) {
                report_label_breakdown["total_time"] =
                  Math.round(
                    report_label_breakdown["total_time"] /
                      Number(rounding_option[0])
                  ) * Number(rounding_option[0]);
                //console.log("四捨五入ループ確認",report_label_breakdown["total_time"]);
              }
            } else if (rounding_option[2] == "c") {
              pro_absence_time =
                Math.ceil(pro_absence_time / Number(rounding_option[0])) *
                Number(rounding_option[0]); //全日欠勤:切り上げ
              pro_absence_not_all_day_time =
                Math.ceil(
                  pro_absence_not_all_day_time / Number(rounding_option[0])
                ) * Number(rounding_option[0]); //欠勤:切り上げ
              pro_shift_time =
                Math.ceil(pro_shift_time / Number(rounding_option[0])) *
                Number(rounding_option[0]); //シフト合計:切り上げ
              pro_scheduled_work_time =
                Math.ceil(
                  pro_scheduled_work_time / Number(rounding_option[0])
                ) * Number(rounding_option[0]); //所定労働時間:切り上げ
              pro_shift_over_work_time =
                Math.ceil(
                  pro_shift_over_work_time / Number(rounding_option[0])
                ) * Number(rounding_option[0]); //残業時間(勤務時間-シフト合計):切り上げ
              works.over =
                Math.ceil(works.over / Number(rounding_option[0])) *
                Number(rounding_option[0]); //シフト外残業:切り上げ
              pro_late_start_time =
                Math.ceil(pro_late_start_time / Number(rounding_option[0])) *
                Number(rounding_option[0]); //遅刻:切り上げ
              pro_fast_end_time =
                Math.ceil(pro_fast_end_time / Number(rounding_option[0])) *
                Number(rounding_option[0]); //早退:切り上げ
              pro_late_start_omit_break_time =
                Math.ceil(pro_late_start_omit_break_time / Number(rounding_option[0])) *
                Number(rounding_option[0]); //遅刻(休憩シフト除外):切り上げ
              pro_fast_end_omit_break_time =
                Math.ceil(pro_fast_end_omit_break_time / Number(rounding_option[0])) *
                Number(rounding_option[0]); //早退(休憩シフト除外):切り上げ
              pro_before_over_work_time =
                Math.ceil(
                  pro_before_over_work_time / Number(rounding_option[0])
                ) * Number(rounding_option[0]); //前残業:切り上げ
              pro_legal_inner_works_over =
                Math.ceil(
                  pro_legal_inner_works_over / Number(rounding_option[0])
                ) * Number(rounding_option[0]); //法定内残業:切り上げ
              pro_actual_work_time =
                Math.ceil(
                  pro_actual_work_time / Number(rounding_option[0])
                ) * Number(rounding_option[0]); //打刻時間:切り上げ
              //給与計算用集計
              payroll_nomal =
                Math.ceil(payroll_nomal / Number(rounding_option[0])) *
                Number(rounding_option[0]); //A: 日中_通常:切り上げ
              payroll_midnight_nomal =
                Math.ceil(payroll_midnight_nomal / Number(rounding_option[0])) *
                Number(rounding_option[0]); //B: 深夜_通常:切り上げ
              payroll_over =
                Math.ceil(payroll_over / Number(rounding_option[0])) *
                Number(rounding_option[0]); //C: 日中_残業:切り上げ
              payroll_midnight_over =
                Math.ceil(payroll_midnight_over / Number(rounding_option[0])) *
                Number(rounding_option[0]); //D: 深夜_残業:切り上げ
              payroll_holiday =
                Math.ceil(payroll_holiday / Number(rounding_option[0])) *
                Number(rounding_option[0]); //E: 日中_休日:切り上げ
              payroll_midnight_holiday =
                Math.ceil(
                  payroll_midnight_holiday / Number(rounding_option[0])
                ) * Number(rounding_option[0]); //F: 深夜_休日:切り上げ
              payroll_over_60_hour =
                Math.ceil(payroll_over_60_hour / Number(rounding_option[0])) *
                Number(rounding_option[0]); //C': 日中_残業60時間以上:切り上げ
              payroll_midnight_over_60_hour =
                Math.ceil(payroll_midnight_over_60_hour / Number(rounding_option[0])) *
                Number(rounding_option[0]); //D': 深夜_残業60時間以上:切り上げ
              //カスタム集計
              custom_payroll.forEach(function (_, c_o_p_i) {
                custom_payroll[c_o_p_i]["agg_result"] =
                  Math.ceil(
                    custom_payroll[c_o_p_i]["agg_result"] /
                      Number(rounding_option[0])
                  ) * Number(rounding_option[0]);
              });
              //日報ラベル集計
              for (let report_label_breakdown of report_label_data) {
                report_label_breakdown["total_time"] =
                  Math.ceil(
                    report_label_breakdown["total_time"] /
                      Number(rounding_option[0])
                  ) * Number(rounding_option[0]);
                //console.log("切り上げループ確認",report_label_breakdown["total_time"]);
              }
            } else if (rounding_option[2] == "f") {
              pro_absence_time =
                Math.floor(pro_absence_time / Number(rounding_option[0])) *
                Number(rounding_option[0]); //全日欠勤:切り捨て
              pro_absence_not_all_day_time =
                Math.floor(
                  pro_absence_not_all_day_time / Number(rounding_option[0])
                ) * Number(rounding_option[0]); //欠勤:切り捨て
              pro_shift_time =
                Math.floor(pro_shift_time / Number(rounding_option[0])) *
                Number(rounding_option[0]); //シフト合計:切り捨て
              pro_scheduled_work_time =
                Math.floor(
                  pro_scheduled_work_time / Number(rounding_option[0])
                ) * Number(rounding_option[0]); //所定労働時間:切り捨て
              pro_shift_over_work_time =
                Math.floor(
                  pro_shift_over_work_time / Number(rounding_option[0])
                ) * Number(rounding_option[0]); //残業時間(勤務時間-シフト合計):切り捨て
              works.over =
                Math.floor(works.over / Number(rounding_option[0])) *
                Number(rounding_option[0]); //シフト外残業:切り捨て
              pro_late_start_time =
                Math.floor(pro_late_start_time / Number(rounding_option[0])) *
                Number(rounding_option[0]); //遅刻:切り捨て
              pro_fast_end_time =
                Math.floor(pro_fast_end_time / Number(rounding_option[0])) *
                Number(rounding_option[0]); //早退:切り捨て
              pro_late_start_omit_break_time =
                Math.floor(pro_late_start_omit_break_time / Number(rounding_option[0])) *
                Number(rounding_option[0]); //遅刻(休憩シフト除外):切り捨て
              pro_fast_end_omit_break_time =
                Math.floor(pro_fast_end_omit_break_time / Number(rounding_option[0])) *
                Number(rounding_option[0]); //早退(休憩シフト除外):切り捨て
              pro_before_over_work_time =
                Math.floor(
                  pro_before_over_work_time / Number(rounding_option[0])
                ) * Number(rounding_option[0]); //前残業:切り捨て
              pro_legal_inner_works_over =
                Math.floor(
                  pro_legal_inner_works_over / Number(rounding_option[0])
                ) * Number(rounding_option[0]); //法定内残業:切り捨て
              pro_actual_work_time =
                Math.floor(
                  pro_actual_work_time / Number(rounding_option[0])
                ) * Number(rounding_option[0]); //打刻時間:切り捨て
              //給与計算用集計
              payroll_nomal =
                Math.floor(payroll_nomal / Number(rounding_option[0])) *
                Number(rounding_option[0]); //A: 日中_通常:切り捨て
              payroll_midnight_nomal =
                Math.floor(
                  payroll_midnight_nomal / Number(rounding_option[0])
                ) * Number(rounding_option[0]); //B: 深夜_通常:切り捨て
              payroll_over =
                Math.floor(payroll_over / Number(rounding_option[0])) *
                Number(rounding_option[0]); //C: 日中_残業:切り捨て
              payroll_midnight_over =
                Math.floor(payroll_midnight_over / Number(rounding_option[0])) *
                Number(rounding_option[0]); //D: 深夜_残業:切り捨て
              payroll_holiday =
                Math.floor(payroll_holiday / Number(rounding_option[0])) *
                Number(rounding_option[0]); //E: 日中_休日:切り捨て
              payroll_midnight_holiday =
                Math.floor(
                  payroll_midnight_holiday / Number(rounding_option[0])
                ) * Number(rounding_option[0]); //F: 深夜_休日:切り捨て
              payroll_over_60_hour =
                Math.floor(payroll_over_60_hour / Number(rounding_option[0])) *
                Number(rounding_option[0]); //C': 日中_残業60時間以上:切り捨て
              payroll_midnight_over_60_hour =
                Math.floor(payroll_midnight_over_60_hour / Number(rounding_option[0])) *
                Number(rounding_option[0]); //D': 深夜_残業60時間以上:切り捨て
              //カスタム集計
              custom_payroll.forEach(function (_, c_o_p_i) {
                custom_payroll[c_o_p_i]["agg_result"] =
                  Math.floor(
                    custom_payroll[c_o_p_i]["agg_result"] /
                      Number(rounding_option[0])
                  ) * Number(rounding_option[0]);
              });
              //日報ラベル集計
              for (let report_label_breakdown of report_label_data) {
                report_label_breakdown["total_time"] =
                  Math.floor(
                    report_label_breakdown["total_time"] /
                      Number(rounding_option[0])
                  ) * Number(rounding_option[0]);
                //console.log("切り捨てループ確認",report_label_breakdown["total_time"]);
              }
            }
          }
        }
      }
    }

    ///////////////////////////////

    //勤務時間(A~F合計)
    pro_work_time =
      payroll_nomal +
      payroll_midnight_nomal +
      payroll_over +
      payroll_midnight_over +
      payroll_holiday +
      payroll_midnight_holiday;
    
    //C'': 日中_残業60時間以内
    payroll_over_inner_60_hour = payroll_over - payroll_over_60_hour;
    //D'': 深夜_残業60時間以内
    payroll_midnight_over_inner_60_hour = payroll_midnight_over - payroll_midnight_over_60_hour;
      
    //法定外残業時間(C+D)
    legal_works.over = payroll_over + payroll_midnight_over;
    //法定外残業時間(C+D)_60時間以内
    legal_works_over_inner_60_hour = payroll_over_inner_60_hour + payroll_midnight_over_inner_60_hour;
    //法定外残業時間(C+D)_60時間以上
    legal_works_over_60_hour = payroll_over_60_hour + payroll_midnight_over_60_hour;
    //深夜労働(B+D+F)
    pro_late_night_work_time =
      payroll_midnight_nomal + payroll_midnight_over + payroll_midnight_holiday;
    //休日労働(E+F)
    pro_holiday_work_time = payroll_holiday + payroll_midnight_holiday; //休日労働(E+F)
    //遅刻早退
    pro_late_fast_time = pro_late_start_time + pro_fast_end_time;

    custom_payroll.forEach(function (c_p_obj) {
      c_p_obj["salary"] =
        c_p_obj["option"]["hourly_pay"] * (c_p_obj["agg_result"] / 60);
      //console.log("丸め前",c_p_obj["salary"]);
      if (c_p_obj["option"]["par_round"] == "r") {
        c_p_obj["salary"] = Math.round(c_p_obj["salary"]);
      } //四捨五入
      else if (c_p_obj["option"]["par_round"] == "c") {
        c_p_obj["salary"] = Math.ceil(c_p_obj["salary"]);
      } //切り上げ
      else if (c_p_obj["option"]["par_round"] == "f") {
        c_p_obj["salary"] = Math.floor(c_p_obj["salary"]);
      } //切り捨て
      //console.log("丸め後",c_p_obj["salary"]);
      custom_payroll_time = custom_payroll_time + Number(c_p_obj["agg_result"]);
      custom_payroll_salary = custom_payroll_salary + Number(c_p_obj["salary"]);
    });

    //console.log("カスタム集計＿最終結果",custom_payroll);
    custom_payroll.forEach(function (c_p_obj) {
      //console.log("最終結果内わけ",c_p_obj["option"]["name"],c_p_obj["option"]["start"],c_p_obj["option"]["end"],c_p_obj["agg_result"],c_p_obj["agg_result_array"]);
    });

    ///////////////////////////////////
    //日報ラベルソート
    //console.log("月合計日報ラベル",report_label_data);

    const array = report_label_data;
    report_label_data = [];

    for (let aggregated_breakdown of array) {
      if (aggregated_breakdown["label_id"] == "break_time") {
        report_label_data.push(aggregated_breakdown);
      }
      //console.log("ループ確認");
    }
    for (let label_key in res["all_label_list"]) {
      for (let aggregated_breakdown of array) {
        if (label_key == aggregated_breakdown["label_id"]) {
          report_label_data.push(aggregated_breakdown);
        }
      }
      //console.log("ループ確認2");
    }
    //console.log("ソート後月合計日報ラベル",report_label_data);

    ///////////////////////////////////

    ///////////////////////////////////////////////////////////////
    //6_4調整
    //分数単位項目
    let tg_month_yuuQ_stock = 0;
    let tg_month_furiQ_stock = 0;
    let tg_month_daiQ_stock = 0;

    let yuuQ_stock = 0;
    let yuuQ_plan = 0;
    let huriQ_stock = 0;
    let huriQ_plan = 0;
    let daiQ_stock = 0;
    let daiQ_plan = 0;

    //日数単位項目
    let tg_month_yuuQ_stock_half_day_unit = 0;
    let tg_month_furiQ_stock_half_day_unit = 0;
    let tg_month_daiQ_stock_half_day_unit = 0;

    let yuuQ_stock_half_day_unit = 0;
    let yuuQ_plan_half_day_unit = 0;
    let huriQ_stock_half_day_unit = 0;
    let huriQ_plan_half_day_unit = 0;
    let daiQ_stock_half_day_unit = 0;
    let daiQ_plan_half_day_unit = 0;

    if (res["holiday_unit_type"] == 0) {
      //分数単位
      tg_month_yuuQ_stock = Number(res["Q_log"]["tg_month_yuuQ_number"]);
      tg_month_furiQ_stock = Number(res["Q_log"]["tg_month_furiQ_number"]);
      tg_month_daiQ_stock = Number(res["Q_log"]["tg_month_daiQ_number"]);

      yuuQ_stock = Number(res["Q_log"]["yuuQ_number"]);
      yuuQ_plan = Number(res["Q_log"]["yuuQ_plan_number"]);
      huriQ_stock = Number(res["Q_log"]["huriQ_number"]);
      huriQ_plan = Number(res["Q_log"]["huriQ_plan_number"]);
      daiQ_stock = Number(res["Q_log"]["daiQ_number"]);
      daiQ_plan = Number(res["Q_log"]["daiQ_plan_number"]);
    } else if (res["holiday_unit_type"] == 1) {
      //日数単位
      tg_month_yuuQ_stock_half_day_unit = Number(
        res["Q_log"]["tg_month_yuuQ_number"]
      );
      tg_month_furiQ_stock_half_day_unit = Number(
        res["Q_log"]["tg_month_furiQ_number"]
      );
      tg_month_daiQ_stock_half_day_unit = Number(
        res["Q_log"]["tg_month_daiQ_number"]
      );

      yuuQ_stock_half_day_unit = Number(res["Q_log"]["yuuQ_number"]);
      yuuQ_plan_half_day_unit = Number(res["Q_log"]["yuuQ_plan_number"]);
      huriQ_stock_half_day_unit = Number(res["Q_log"]["huriQ_number"]);
      huriQ_plan_half_day_unit = Number(res["Q_log"]["huriQ_plan_number"]);
      daiQ_stock_half_day_unit = Number(res["Q_log"]["daiQ_number"]);
      daiQ_plan_half_day_unit = Number(res["Q_log"]["daiQ_plan_number"]);
    }
    ///////////////////////////////////////////////////////////////

    if (res["group_data"] != null) {
      var groupname = res["group_data"].name;
    } else {
      var groupname = "----";
    }


    const aggregate_date = moment().format('YYYY-MM-DD HH:mm:ss');
    const version = "v20230127";

    let res_data = {
      version: version, //集計処理のバージョン
      aggregate_date: aggregate_date, //集計日

      //基本情報
      target_month: target_month, //対象月
      user_name: res["user_name"], //社員名
      group_name: groupname, //グループ名
      login_id: res["login_id"], //会員ID

      //集計方法
      rounding_option: rounding_option_str, //時間丸め方法
      required_shift_option: required_shift_option_str, //シフトなし打刻

      //勤務記録表、表示切替フラグ
      minute_format_type: "h",
      Q_format_type: "d",
      agg_display_type: "A_F",
      C_D_display_type: "total", //合計:total, 分割:breakdown

      //集計期間
      start_date: start_date, //集計開始日
      end_date: end_date, //集計終了日

      //集計上必要情報
      workminutes_per_day: Number(res["user_data"]["workminutes_per_day"]),
      work_agg_salary_show: Number(res["user_data"]["work_agg_salary_show"]),
      group_shift_result_review: Number(
        res["user_data"]["group_shift_result_review"]
      ), //勤務実績確認状況表示
      holiday_unit_type: res["holiday_unit_type"], //休暇単位 0:分数単位 1:日数単位
      working_type: res["shift_template_data"]["working_type"], //労働志度 0:通常労働制 1:変形労働制
      normal_work_month_limit: NumbermonthNormalWorklimit, //月合計の法定内の労働時間の上限
      normal_work_week_limit: arrayWeekNormalWorklimit, //週毎の法定内の労働時間の上限

      //給与計算用集計(分)
      payroll_nomal: payroll_nomal, //A: 日中_通常
      payroll_midnight_nomal: payroll_midnight_nomal, //B: 深夜_通常
      payroll_over: payroll_over, //C: 日中_残業
      payroll_midnight_over: payroll_midnight_over, //D: 深夜_残業
      payroll_holiday: payroll_holiday, //E: 日中_休日
      payroll_midnight_holiday: payroll_midnight_holiday, //F: 深夜_休日
      payroll_over_60_hour: payroll_over_60_hour, //C': 日中_残業60時間以上
      payroll_midnight_over_60_hour: payroll_midnight_over_60_hour, //D': 深夜_残業60時間以上
      payroll_over_inner_60_hour: payroll_over_inner_60_hour, //C'': 日中_残業60時間以内
      payroll_midnight_over_inner_60_hour: payroll_midnight_over_inner_60_hour, //D'': 深夜_残業60時間以内

      pro_custom_payroll: custom_payroll, //カスタム集計(時給時間帯)
      custom_payroll_time: custom_payroll_time, //企業ごとカスタム集計_合計時間
      custom_payroll_salary: custom_payroll_salary, //企業ごとカスタム集計_合計給与

      //勤務日数
      pro_work_day_number: pro_work_day_number, //出勤
      pro_absence_number: pro_absence_number, //全日欠勤
      pro_late_fast_number: pro_late_fast_number, //遅刻早退
      pro_late_start_number: pro_late_start_number, //遅刻
      pro_fast_end_number: pro_fast_end_number, //早退
      pro_holiday_work_number: pro_holiday_work_number, //休日出勤
      pro_vac_day_number: pro_vac_day_number, //有給取得
      pro_yuuQ_all_day_number: pro_yuuQ_all_day_number, //全日有給取得日
      pro_holiday_number: pro_holiday_number, //休日(所定＋法定)
      pro_normal_holiday_number: pro_normal_holiday_number, //所定休日日数
      pro_legal_holiday_number: pro_legal_holiday_number, //法定休日日数

      //勤務時間
      pro_work_time: pro_work_time, //勤務(A～F合計)
      pro_break_time: pro_break_time, //休憩合計
      pro_shift_time: pro_shift_time, //シフト合計
      pro_scheduled_work_time: pro_scheduled_work_time, //所定労働時間
      pro_shift_over_work_time: pro_shift_over_work_time, //残業時間(勤務時間-シフト合計)
      works_over: works.over, //シフト外残業
      legal_works_over: legal_works.over, //法定外残業(C+D)
      legal_works_over_inner_60_hour: legal_works_over_inner_60_hour, //法定外残業(C+D)_60時間以内
      legal_works_over_60_hour: legal_works_over_60_hour, //法定外残業(C+D)_60時間以上
      pro_late_night_work_time: pro_late_night_work_time, //深夜労働(B+D+F)
      pro_holiday_work_time: pro_holiday_work_time, //休日労働(E+F)
      pro_absence_time: pro_absence_time, //全日欠勤
      pro_absence_not_all_day_time: pro_absence_not_all_day_time, //欠勤
      pro_late_fast_time: pro_late_fast_time, //遅刻早退
      pro_late_start_time: pro_late_start_time, //遅刻
      pro_fast_end_time: pro_fast_end_time, //早退
      pro_late_start_omit_break_time: pro_late_start_omit_break_time, //遅刻_休憩シフトを引く
      pro_fast_end_omit_break_time: pro_fast_end_omit_break_time, //早退_休憩シフトを引く
      pro_before_over_work_time: pro_before_over_work_time, //前残業
      pro_legal_inner_works_over: pro_legal_inner_works_over, //法定内残業
      pro_normal_holiday_work_time: pro_normal_holiday_work_time, //所定休日労働
      pro_actual_work_time: pro_actual_work_time, //打刻時間

      ///////////////////////////////
      //分数単位
      //休暇消化時間(集計月)
      yuuQ_time: yuuQ_time, //有休消化
      furiQ_time: furiQ_time, //振休消化
      daiQ_time: daiQ_time, //代休消化

      //休暇付与時間(集計月)
      yuuQ_in_time: yuuQ_in_time, //有休付与
      furiQ_in_time: furiQ_in_time, //振休付与
      daiQ_in_time: daiQ_in_time, //代休付与

      //休暇残時間(集計時点)
      tg_month_yuuQ_stock: tg_month_yuuQ_stock, //有休残数
      tg_month_furiQ_stock: tg_month_furiQ_stock, //振休残数
      tg_month_daiQ_stock: tg_month_daiQ_stock, //代休残数

      //休暇残時間(出力日時点)
      yuuQ_stock: yuuQ_stock, //有休残数
      yuuQ_plan: yuuQ_plan, //有休消化予定
      huriQ_stock: huriQ_stock, //振休残数
      huriQ_plan: huriQ_plan, //振休消化予定
      daiQ_stock: daiQ_stock, //代休残数
      daiQ_plan: daiQ_plan, //代休消化予定

      //日数単位
      //休暇消化時間(集計月)
      yuuQ_time_half_day_unit: Number(yuuQ_time_half_day_unit) / 2, //有休消化
      furiQ_time_half_day_unit: Number(furiQ_time_half_day_unit) / 2, //振休消化
      daiQ_time_half_day_unit: Number(daiQ_time_half_day_unit) / 2, //代休消化

      //休暇付与時間(集計月)
      yuuQ_in_time_half_day_unit: Number(yuuQ_in_time_half_day_unit) / 2, //有休付与
      furiQ_in_time_half_day_unit: Number(furiQ_in_time_half_day_unit) / 2, //振休付与
      daiQ_in_time_half_day_unit: Number(daiQ_in_time_half_day_unit) / 2, //代休付与

      //休暇残時間(集計時点)
      tg_month_yuuQ_stock_half_day_unit:
        Number(tg_month_yuuQ_stock_half_day_unit) / 2, //有休残数
      tg_month_furiQ_stock_half_day_unit:
        Number(tg_month_furiQ_stock_half_day_unit) / 2, //振休残数
      tg_month_daiQ_stock_half_day_unit:
        Number(tg_month_daiQ_stock_half_day_unit) / 2, //代休残数

      //休暇残時間(出力日時点)
      yuuQ_stock_half_day_unit: Number(yuuQ_stock_half_day_unit) / 2, //有休残数
      yuuQ_plan_half_day_unit: Number(yuuQ_plan_half_day_unit) / 2, //有休消化予定
      huriQ_stock_half_day_unit: Number(huriQ_stock_half_day_unit) / 2, //振休残数
      huriQ_plan_half_day_unit: Number(huriQ_plan_half_day_unit) / 2, //振休消化予定
      daiQ_stock_half_day_unit: Number(daiQ_stock_half_day_unit) / 2, //代休残数
      daiQ_plan_half_day_unit: Number(daiQ_plan_half_day_unit) / 2, //代休消化予定
      ///////////////////////////////

      report_label_data: report_label_data, //日報ラベル集計

      pro_exday_number_array: pro_exday_number_array, //特殊日集計

      oneday_breakdown_list: oneday_breakdown_list, ////一日ごと内わけ用配列
    };

    console.log("集計データ", res_data);
    //console.log("日ごとデータ確認",oneday_breakdown_list);
    return res_data;
  };
