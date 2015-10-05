var timerDependency = new Deps.Dependency;

const calcHours = (startTime, stopTime) => {
  const minutes = moment(stopTime).diff(startTime, 'minutes');
  const fractionHours = minutes/60;
  const rainminingMinutes = minutes%60;
  const hours = parseInt(fractionHours) + (rainminingMinutes > 15 ? .5 : 0) + (rainminingMinutes > 45 ? .5 : 0);
  return Math.max(hours, .5);
}

const getProject = function() {
  if (Session.get('project')) {
    return Session.get('project');
  }

  const project = Projects.findOne({});
  if (project) {
    return project._id;
  }
}

const getTasks = () => {
  return Tasks.find({
    project: getProject(),
    startTime: {
      $gte: new Date(Session.get('year'), Session.get('month'), 1),
      $lte: moment(new Date(Session.get('year'), Session.get('month'))).endOf('month').toDate()
    }
  }, {sort: {startTime: -1}});
}

if (Meteor.isClient) {
  Template.timeTable.helpers({
    tasks: getTasks,

    years: function() {
      const project = getProject();

      const firstTask = Tasks.findOne({project: project},
        {sort: {startTime: 1}, limit: 1});
      if (!firstTask) {
        return;
      }
      const startYear = moment(firstTask.startTime).year();

      const lastTask = Tasks.findOne({project: project},
        {sort: {startTime: 1}, limit: 1});
      if (!lastTask) {
        return;
      }
      const stopYear = moment(lastTask.startTime).year();

      var result = [];

      for (let n = startYear; n <= stopYear; ++n) {
        result.push({
          year: n,
          current: n === Session.get('year')
        });
      }

      return result.reverse();
    },

    months: function() {
      const project = getProject();

      const firstTask = Tasks.findOne({
        project: project,
        startTime: {
          $gte: new Date(Session.get('year'), 1),
          $lte: moment(new Date(Session.get('year') + 1, 1)).endOf('year').toDate()
        }
      },{sort: {startTime: 1}, limit: 1})
      if (!firstTask) {
        return;
      }
      const startMonth = moment(firstTask.startTime).month();

      const lastTask = Tasks.findOne({
        project: project,
        startTime: {
          $gte: new Date(Session.get('year'), 1, 1),
          $lte: moment(new Date(Session.get('year') + 1, 1)).endOf('year').toDate()
        }
      },{sort: {startTime: -1}, limit: 1});
      if (!lastTask) {
        return;
      }
      const stopMonth = moment(lastTask.startTime).month();

      var result = [];

      for (let n = startMonth; n <= stopMonth; ++n) {
        result.push({
          month: n,
          monthName: moment().month(n).format('MMMM'),
          current: n === Session.get('month')
        });
      }

      return result.reverse();
    },

    summary: function() {
      const tasks = getTasks().fetch();
      const hours = _.reduce(tasks, (n, t) => { return n + calcHours(t.startTime, t.stopTime) }, 0);
      const project = Projects.findOne({_id: getProject()});
      const salary = hours * project.hourlyRate;
      return `<strong>${salary} €</strong> =  ${hours} h * ${project.hourlyRate} € HR`;
    }
  });

  Template.timeTable.created = function() {
    if(!Session.get('year')) {
      Session.set('year', moment().year());
    }

    if(!Session.get('month')) {
      Session.set('month', moment().month());
    }
  };

  Template.year.events({
    'click a': function() {
      Session.set('year', this.year);
    }
  });

  Template.month.events({
    'click a': function() {
      Session.set('month', this.month);
    }
  });

  Template.task.helpers({
    date: function() {
      return moment(this.startTime).format('dd, DD.MM.YY');
    },
    start: function() {
      return moment(this.startTime).format('HH:mm');
    },
    finish: function() {
      return moment(this.stopTime).format('HH:mm');
    },
    projectName: function() {
      const project = Projects.findOne({_id: this.project});
      return project ? project.name : '<no project>'
    },
    hours: function() {
      return `${calcHours(this.startTime, this.stopTime)} h (${moment(this.stopTime).diff(moment(this.startTime), 'minutes')} min)`
    }
  });

  Template.task.events({
    'dblclick .delete-button': function() {
      Tasks.remove(this._id);
    }
  });

  Template.task.rendered = function() {
    $('.description.editable').editable({
      toggle: 'dblclick',
      mode: 'inline',
      display: false,
      type: 'textarea',
      emptytext: 'no description',
      rows: 2,
      success: function(response, newValue) {
        Tasks.update({_id: $(this).data('id')}, {$set: {description: newValue}});
      }
    });

    $('.start-time.editable').editable({
      toggle: 'dblclick',
      mode: 'inline',
      display: false,
      type: 'combodate',
      emptytext: '',
      viewformat: 'HH:mm',
      format: '',
      combodate: {
        minuteStep: 1
      },
      template: 'HH:mm / DD.MM.YY',
      success: function(response, newValue) {
        Tasks.update({_id: $(this).data('id')}, {$set: {startTime: newValue.toDate()}});
      }
    });

    $('.stop-time.editable').editable({
      toggle: 'dblclick',
      mode: 'inline',
      display: false,
      type: 'combodate',
      emptytext: '',
      viewformat: 'HH:mm',
      format: '',
      combodate: {
        minuteStep: 1
      },
      template: 'HH:mm / DD.MM.YY',
      success: function(response, newValue) {
        Tasks.update({_id: $(this).data('id')}, {$set: {stopTime: newValue.toDate()}});
      }
    });

    $('.project.editable').editable({
      toggle: 'dblclick',
      mode: 'inline',
      display: false,
      type: 'select2',
      emptytext: '',
      source: Projects.find().map(p => { return { id: p._id, text: p.name } }),
      success: function(response, newValue) {
        Tasks.update({_id: $(this).data('id')}, {$set: {project: newValue}});
      }
    });
  };

  const hoursToday = function() {
    const tasks = Tasks.find({
      project: getProject(),
      startTime: {
        $gte: moment().startOf('day').toDate(),
        $lte: moment().endOf('day').toDate()
      }
    }).fetch();
    const hours = _.reduce(tasks, (n, t) => { return n + calcHours(t.startTime, t.stopTime) }, 0);
    return hours + (Session.get('started') ? calcHours(moment(Session.get('startTime')), new Date()) : 0);
  }

  Template.addTask.helpers({
    projects() {
      return Projects.find();
    },
    started() {
      return Session.get('started');
    },
    startedText() {
      timerDependency.depend();
      const startTime = moment(Session.get('startTime'));
      return `Started at ${startTime.format('HH:mm')} (${moment().diff(moment(startTime), 'minutes')} min / ${calcHours(startTime, new Date())} h)`;
    },
    showPanel: function() {
      const project = Projects.findOne({_id: getProject()});
      return !!project.hoursPerDay || Session.get('started');
    },
    hasHoursPerDay: function() {
      const project = Projects.findOne({_id: getProject()});
      return !!project.hoursPerDay;
    },
    progress: function() {
      timerDependency.depend();
      const project = Projects.findOne({_id: getProject()});
      return Math.min(hoursToday() / project.hoursPerDay * 100, 100);
    },
    progressText: function() {
      timerDependency.depend();
      const project = Projects.findOne({_id: getProject()});
      const hours = hoursToday();
      if (hours) {
        return `${hours} h / ${project.hoursPerDay} h`;
      }
    },
    success: function() {
      timerDependency.depend();
      const project = Projects.findOne({_id: getProject()});
      return hoursToday() >= project.hoursPerDay;
    }
  });

  Template.addTask.created = function() {
    this.duration = new ReactiveVar(0);
    this.timerHandle = Meteor.setInterval(() => {
      timerDependency.changed();
    }, 1000 * 15);
  };

  Template.addTask.destroyed = function() {
    Meteor.clearInterval(this.timerHandle);
    $('#select-project').off('change');
  };

  Template.addTask.rendered = function() {
    $('#select-project').select2()
    .on('change', () => {
      Session.set('project', $('#select-project').val());
    });

    $('#select-minutes').select2();

    $('#datetime').datetimepicker({
      locale: 'de',
      defaultDate: new Date(),
      sideBySide: true,
    });
  };

  const stopTask = function(stopTime) {
    Session.set('started', false);
    $('#datetime').data("DateTimePicker").minDate(false);
    Tasks.insert({
      description: $('#description').val(),
      startTime: Session.get('startTime'),
      stopTime: stopTime,
      project: $('#select-project').val(),
      createdAt: new Date()
    });
  };

  const startTask = function(startTime) {
    Session.set('started', true);
    Session.set('startTime', startTime);
    $('#datetime').data("DateTimePicker").minDate(Session.get('startTime'));
  }

  Template.addTask.events({
    'click #start-timer': function() {
      startTask(new Date());
      return false;
    },
    'click #start-timer-at': function() {
      startTask($('#datetime').data("DateTimePicker").date().toDate());
      return false;
    },
    'click #start-timer-ago': function() {
      startTask(moment().subtract($('#minutes').val(), 'minutes').toDate());
      return false;
    },
    'click #stop-timer': function() {
      stopTask(new Date());
      return false;
    },
    'click #stop-timer-at': function() {
      stopTask($('#datetime').data("DateTimePicker").date().toDate());
      return false;
    },
    'click #stop-timer-in': function() {
      stopTask(moment().add($('#minutes').val(), 'minutes').toDate());
      return false;
    }
  });
}
