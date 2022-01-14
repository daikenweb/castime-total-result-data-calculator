export const OUT_WORK_AGG = function (n_w_b_obj, out_work_data) {
  //console.log("シフト外残業時間集計処理関数動作",tg_date,n_w_b_obj,out_work_data);
  var res_array = {
    start: "",
    end: "",
    total_time: 0,
  };

  //比較する時刻全て、日付のデータまで入っているため日跨ぎなどを考慮する必要はない
  if (
    moment(n_w_b_obj["start"]) <= moment(out_work_data["start"]) &&
    moment(out_work_data["end"]) <= moment(n_w_b_obj["end"])
  ) {
    res_array["total_time"] = Math.floor(
      (moment(out_work_data["end"]) - moment(out_work_data["start"])) / 60000
    );
    res_array["start"] = out_work_data["start"];
    res_array["end"] = out_work_data["end"];
    //console.log("パターン1");
  } else if (
    moment(out_work_data["start"]) <= moment(n_w_b_obj["start"]) &&
    moment(n_w_b_obj["end"]) <= moment(out_work_data["end"])
  ) {
    res_array["total_time"] = Math.floor(
      (moment(n_w_b_obj["end"]) - moment(n_w_b_obj["start"])) / 60000
    );
    res_array["start"] = n_w_b_obj["start"];
    res_array["end"] = n_w_b_obj["end"];
    //console.log("パターン2");
  } else if (
    moment(n_w_b_obj["start"]) <= moment(out_work_data["start"]) &&
    moment(out_work_data["start"]) <= moment(n_w_b_obj["end"]) &&
    moment(n_w_b_obj["end"]) <= moment(out_work_data["end"])
  ) {
    res_array["total_time"] = Math.floor(
      (moment(n_w_b_obj["end"]) - moment(out_work_data["start"])) / 60000
    );
    res_array["start"] = out_work_data["start"];
    res_array["end"] = n_w_b_obj["end"];
    //console.log("パターン3");
  } else if (
    moment(out_work_data["start"]) <= moment(n_w_b_obj["start"]) &&
    moment(n_w_b_obj["start"]) <= moment(out_work_data["end"]) &&
    moment(out_work_data["end"]) <= moment(n_w_b_obj["end"])
  ) {
    res_array["total_time"] = Math.floor(
      (moment(out_work_data["end"]) - moment(n_w_b_obj["start"])) / 60000
    );
    res_array["start"] = n_w_b_obj["start"];
    res_array["end"] = out_work_data["end"];
    //console.log("パターン4");
  }

  //console.log("シフト外残業集計結果",res_array);
  return res_array;
};

export const Deep_Night_AGG = function (tg_date, n_w_b_obj) {
  //console.log("深夜判定データ",tg_date,n_w_b_obj);
  //var alone_deep_night_nomal_work_time = 0;

  var res_array = {
    nomal: {
      start: "",
      end: "",
      total_time: 0,
    },
    night: {
      start: "",
      end: "",
      total_time: 0,
    },
  };
  res_array["nomal"]["total_time"] = Number(n_w_b_obj["total_time"]);
  res_array["nomal"]["start"] = n_w_b_obj["start"];
  res_array["nomal"]["end"] = n_w_b_obj["end"];

  var deep_night_end = tg_date + " 05:00:00";
  if (
    moment(n_w_b_obj["start"]) <= moment(deep_night_end) &&
    moment(n_w_b_obj["end"]) <= moment(deep_night_end)
  ) {
    //alone_deep_night_nomal_work_time += Math.floor((moment(n_w_b_obj["end"]) - moment(n_w_b_obj["start"]))/60000);
    res_array["night"]["total_time"] = Math.floor(
      (moment(n_w_b_obj["end"]) - moment(n_w_b_obj["start"])) / 60000
    );
    res_array["night"]["start"] = n_w_b_obj["start"];
    res_array["night"]["end"] = n_w_b_obj["end"];

    res_array["nomal"]["total_time"] = 0;
    res_array["nomal"]["start"] = "";
    res_array["nomal"]["end"] = "";
    //console.log("深夜から仕事が始まるパターン1");
  } else if (moment(n_w_b_obj["start"]) <= moment(deep_night_end)) {
    //alone_deep_night_nomal_work_time += Math.floor((moment(deep_night_end) - moment(n_w_b_obj["start"]))/60000);
    res_array["night"]["total_time"] = Math.floor(
      (moment(deep_night_end) - moment(n_w_b_obj["start"])) / 60000
    );
    res_array["night"]["start"] = n_w_b_obj["start"];
    res_array["night"]["end"] = deep_night_end;

    res_array["nomal"]["total_time"] =
      Number(n_w_b_obj["total_time"]) -
      Number(res_array["night"]["total_time"]);
    res_array["nomal"]["start"] = deep_night_end;
    res_array["nomal"]["end"] = n_w_b_obj["end"];
    //console.log("深夜から仕事が始まるパターン2");
  }

  var deep_night_start = tg_date + " 22:00:00";
  deep_night_end =
    moment(tg_date).add(1, "day").format("YYYY-MM-DD") + " 05:00:00";
  if (
    moment(n_w_b_obj["start"]) <= moment(deep_night_start) &&
    moment(deep_night_start) <= moment(n_w_b_obj["end"]) &&
    moment(n_w_b_obj["end"]) <= moment(deep_night_end)
  ) {
    //alone_deep_night_nomal_work_time += Math.floor((moment(n_w_b_obj["end"]) - moment(deep_night_start))/60000);
    res_array["night"]["total_time"] = Math.floor(
      (moment(n_w_b_obj["end"]) - moment(deep_night_start)) / 60000
    );
    res_array["night"]["start"] = deep_night_start;
    res_array["night"]["end"] = n_w_b_obj["end"];

    res_array["nomal"]["total_time"] =
      Number(n_w_b_obj["total_time"]) -
      Number(res_array["night"]["total_time"]);
    res_array["nomal"]["start"] = n_w_b_obj["start"];
    res_array["nomal"]["end"] = deep_night_start;

    //console.log("深夜パターン1");
  } else if (
    moment(deep_night_start) <= moment(n_w_b_obj["start"]) &&
    moment(n_w_b_obj["end"]) <= moment(deep_night_end)
  ) {
    //alone_deep_night_nomal_work_time += Math.floor((moment(n_w_b_obj["end"]) - moment(n_w_b_obj["start"]))/60000);
    res_array["night"]["total_time"] += Math.floor(
      (moment(n_w_b_obj["end"]) - moment(n_w_b_obj["start"])) / 60000
    );
    res_array["night"]["start"] = n_w_b_obj["start"];
    res_array["night"]["end"] = n_w_b_obj["end"];

    res_array["nomal"]["total_time"] = 0;
    res_array["nomal"]["start"] = "";
    res_array["nomal"]["end"] = "";
    //console.log("深夜パターン2");
  } else if (
    moment(deep_night_start) <= moment(n_w_b_obj["start"]) &&
    moment(n_w_b_obj["start"]) <= moment(deep_night_end) &&
    moment(deep_night_end) <= moment(n_w_b_obj["end"])
  ) {
    //alone_deep_night_nomal_work_time += Math.floor((moment(deep_night_end) - moment(n_w_b_obj["start"]))/60000);
    res_array["night"]["total_time"] += Math.floor(
      (moment(deep_night_end) - moment(n_w_b_obj["start"])) / 60000
    );
    res_array["night"]["start"] = n_w_b_obj["start"];
    res_array["night"]["end"] = deep_night_end;

    res_array["nomal"]["total_time"] =
      Number(n_w_b_obj["total_time"]) -
      Number(res_array["night"]["total_time"]);
    res_array["nomal"]["start"] = deep_night_end;
    res_array["nomal"]["end"] = n_w_b_obj["end"];
    //console.log("深夜パターン3");
  } else if (
    moment(n_w_b_obj["start"]) <= moment(deep_night_start) &&
    moment(deep_night_end) <= moment(n_w_b_obj["end"])
  ) {
    //alone_deep_night_nomal_work_time += Math.floor((moment(deep_night_end) - moment(deep_night_start))/60000);
    //console.log("深夜パターン4");
    //判定するデータは0:00で区切る処理で生成しているためこのパターンになることはないはず
  }
  //return alone_deep_night_nomal_work_time;

  //console.log("深夜判定結果",res_array);
  return res_array;
};

///////////////////////////////////////////////////////
///////////////////////////////////////////////////////
//カスタム集計処理関数
export const CUSTOM_AGG = function (tg_date, n_w_b_obj, custam_data) {
  //console.log("カスタム集計処理関数動作",tg_date,n_w_b_obj,custam_data);
  var res_array = {
    start: "",
    end: "",
    total_time: 0,
  };

  let custom_start = tg_date + " " + custam_data["start"] + ":00";
  let custom_end = tg_date + " " + custam_data["end"] + ":00";

  if (moment(custom_start) < moment(custom_end)) {
    //日を跨がない
    if (
      moment(n_w_b_obj["start"]) <= moment(custom_start) &&
      moment(custom_end) <= moment(n_w_b_obj["end"])
    ) {
      res_array["total_time"] = Math.floor(
        (moment(custom_end) - moment(custom_start)) / 60000
      );
      res_array["start"] = custom_start;
      res_array["end"] = custom_end;
      //console.log("パターン1");
    } else if (
      moment(custom_start) <= moment(n_w_b_obj["start"]) &&
      moment(n_w_b_obj["end"]) <= moment(custom_end)
    ) {
      res_array["total_time"] = Math.floor(
        (moment(n_w_b_obj["end"]) - moment(n_w_b_obj["start"])) / 60000
      );
      res_array["start"] = n_w_b_obj["start"];
      res_array["end"] = n_w_b_obj["end"];
      //console.log("パターン2");
    } else if (
      moment(n_w_b_obj["start"]) <= moment(custom_start) &&
      moment(custom_start) <= moment(n_w_b_obj["end"]) &&
      moment(n_w_b_obj["end"]) <= moment(custom_end)
    ) {
      res_array["total_time"] = Math.floor(
        (moment(n_w_b_obj["end"]) - moment(custom_start)) / 60000
      );
      res_array["start"] = custom_start;
      res_array["end"] = n_w_b_obj["end"];
      //console.log("パターン3");
    } else if (
      moment(custom_start) <= moment(n_w_b_obj["start"]) &&
      moment(n_w_b_obj["start"]) <= moment(custom_end) &&
      moment(custom_end) <= moment(n_w_b_obj["end"])
    ) {
      res_array["total_time"] = Math.floor(
        (moment(custom_end) - moment(n_w_b_obj["start"])) / 60000
      );
      res_array["start"] = n_w_b_obj["start"];
      res_array["end"] = custom_end;
      //console.log("パターン4");
    }
  } else {
    //日を跨ぐ(丸1日の設定にも対応)
    let deep_night_end = tg_date + " " + custam_data["end"] + ":00";
    if (
      moment(n_w_b_obj["start"]) <= moment(deep_night_end) &&
      moment(n_w_b_obj["end"]) <= moment(deep_night_end)
    ) {
      res_array["total_time"] = Math.floor(
        (moment(n_w_b_obj["end"]) - moment(n_w_b_obj["start"])) / 60000
      );
      res_array["start"] = n_w_b_obj["start"];
      res_array["end"] = n_w_b_obj["end"];
      //console.log("深夜から仕事が始まるパターン1");
    } else if (moment(n_w_b_obj["start"]) <= moment(deep_night_end)) {
      res_array["total_time"] = Math.floor(
        (moment(deep_night_end) - moment(n_w_b_obj["start"])) / 60000
      );
      res_array["start"] = n_w_b_obj["start"];
      res_array["end"] = deep_night_end;
      //console.log("深夜から仕事が始まるパターン2");
    }

    let deep_night_start = tg_date + " " + custam_data["start"] + ":00";
    deep_night_end =
      moment(tg_date).add(1, "day").format("YYYY-MM-DD") +
      " " +
      custam_data["end"] +
      ":00";
    if (
      moment(n_w_b_obj["start"]) <= moment(deep_night_start) &&
      moment(deep_night_start) <= moment(n_w_b_obj["end"]) &&
      moment(n_w_b_obj["end"]) <= moment(deep_night_end)
    ) {
      res_array["total_time"] = Math.floor(
        (moment(n_w_b_obj["end"]) - moment(deep_night_start)) / 60000
      );
      res_array["start"] = deep_night_start;
      res_array["end"] = n_w_b_obj["end"];
      //console.log("深夜パターン1");
    } else if (
      moment(deep_night_start) <= moment(n_w_b_obj["start"]) &&
      moment(n_w_b_obj["end"]) <= moment(deep_night_end)
    ) {
      res_array["total_time"] += Math.floor(
        (moment(n_w_b_obj["end"]) - moment(n_w_b_obj["start"])) / 60000
      );
      res_array["start"] = n_w_b_obj["start"];
      res_array["end"] = n_w_b_obj["end"];
      //console.log("深夜パターン2");
    } else if (
      moment(deep_night_start) <= moment(n_w_b_obj["start"]) &&
      moment(n_w_b_obj["start"]) <= moment(deep_night_end) &&
      moment(deep_night_end) <= moment(n_w_b_obj["end"])
    ) {
      res_array["total_time"] += Math.floor(
        (moment(deep_night_end) - moment(n_w_b_obj["start"])) / 60000
      );
      res_array["start"] = n_w_b_obj["start"];
      res_array["end"] = deep_night_end;
      //console.log("深夜パターン3");
    } else if (
      moment(n_w_b_obj["start"]) <= moment(deep_night_start) &&
      moment(deep_night_end) <= moment(n_w_b_obj["end"])
    ) {
      //console.log("深夜パターン4");
      //判定するデータは0:00で区切る処理で生成しているためこのパターンになることはないはず
    }
  }

  //console.log("集計結果",res_array);
  return res_array;
};
