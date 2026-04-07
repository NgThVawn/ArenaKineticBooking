var priceRuleModel = require('../schemas/priceRules');
var fieldModel = require('../schemas/fields');

// Chuyển 'HH:mm' thành số phút kể từ 00:00
function timeToMinutes(timeStr) {
  var parts = timeStr.split(':');
  return parseInt(parts[0]) * 60 + parseInt(parts[1]);
}

// Kiểm tra ngày có phải cuối tuần không
function isWeekend(dateStr) {
  var d = new Date(dateStr + 'T00:00:00');
  var day = d.getDay();
  return day === 0 || day === 6; // Sunday=0, Saturday=6
}

module.exports = {
  FindByField: async function (fieldId) {
    return await priceRuleModel.find({ field: fieldId, isDeleted: false })
      .sort({ priority: -1, createdAt: 1 });
  },

  Create: async function (data) {
    var rule = new priceRuleModel(data);
    await rule.save();
    return rule;
  },

  Update: async function (id, data) {
    return await priceRuleModel.findByIdAndUpdate(id, data, { new: true });
  },

  Delete: async function (id) {
    return await priceRuleModel.findByIdAndUpdate(id, { isDeleted: true }, { new: true });
  },

  // Tính giá cho một khung giờ đặt sân
  // Trả về { totalPrice, breakdown: [{slot, price, rule}] }
  CalculatePrice: async function (fieldId, dateStr, startTime, endTime) {
    var field = await fieldModel.findOne({ _id: fieldId, isDeleted: false });
    if (!field) throw new Error('Không tìm thấy sân');

    var rules = await priceRuleModel.find({
      field: fieldId,
      isActive: true,
      isDeleted: false
    }).sort({ priority: -1 });

    var weekend = isWeekend(dateStr);
    var startMin = timeToMinutes(startTime);
    var endMin = timeToMinutes(endTime);

    var totalPrice = 0;
    var breakdown = [];

    // Lặp theo từng slot 30 phút
    for (var t = startMin; t < endMin; t += 30) {
      var slotStart = t;
      var slotEnd = t + 30;
      var slotStartStr = Math.floor(slotStart / 60).toString().padStart(2, '0') + ':' +
        (slotStart % 60).toString().padStart(2, '0');
      var slotEndStr = Math.floor(slotEnd / 60).toString().padStart(2, '0') + ':' +
        (slotEnd % 60).toString().padStart(2, '0');

      // Tìm rule phù hợp (priority cao nhất trước)
      var matchedRule = null;
      for (var i = 0; i < rules.length; i++) {
        var rule = rules[i];
        var ruleStart = timeToMinutes(rule.startTime);
        var ruleEnd = timeToMinutes(rule.endTime);

        var dayMatches = rule.dayType === 'ALL' ||
          (rule.dayType === 'WEEKEND' && weekend) ||
          (rule.dayType === 'WEEKDAY' && !weekend);

        var timeMatches = ruleStart <= slotStart && ruleEnd >= slotEnd;

        if (dayMatches && timeMatches) {
          matchedRule = rule;
          break;
        }
      }

      var priceForSlot = matchedRule ? matchedRule.pricePerHour / 2 : field.pricePerHour / 2;
      totalPrice += priceForSlot;
      breakdown.push({
        slot: slotStartStr + ' - ' + slotEndStr,
        price: priceForSlot,
        rule: matchedRule ? matchedRule.name : 'Giá cơ bản'
      });
    }

    return { totalPrice: Math.round(totalPrice), breakdown };
  }
};