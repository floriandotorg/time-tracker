Tasks = new Mongo.Collection("tasks");

var timerDependency = new Deps.Dependency;

const calcHours = (startTime, stopTime) => {
  const hours = moment(stopTime).diff(startTime, 'hours');
  return Math.max(hours, .5);
}

const getTasks = () => {
  return Tasks.find({
    project: Session.get('project'),
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
      const startYear = moment(Tasks.findOne({project: Session.get('project')},
        {sort: {startTime: 1}, limit: 1}).startTime).year();
      const stopYear = moment(Tasks.findOne({project: Session.get('project')},
        {sort: {startTime: -1}, limit: 1}).startTime).year();
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
      const startMonth = moment(Tasks.findOne({
        project: Session.get('project'),
        startTime: {
          $gte: new Date(Session.get('year'), 1),
          $lte: moment(new Date(Session.get('year') + 1, 1)).endOf('year').toDate()
        }
      },{sort: {startTime: 1}, limit: 1}).startTime).month();
      const stopMonth = moment(Tasks.findOne({
        project: Session.get('project'),
        startTime: {
          $gte: new Date(Session.get('year'), 1, 1),
          $lte: moment(new Date(Session.get('year') + 1, 1)).endOf('year').toDate()
        }
      },{sort: {startTime: -1}, limit: 1}).startTime).month();
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
      const project = Projects.findOne({_id: Session.get('project')});
      const salary = hours * project.hourlyRate;
      return `${salary} € =  ${hours} h * ${project.hourlyRate} € HR`;
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
      return `${calcHours(this.startTime, this.stopTime)} h`
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
      return `Started at ${startTime.format('HH:mm')} (${moment().diff(startTime, 'hours')} h)`;
    }
  });

  Template.addTask.created = function() {
    this.duration = new ReactiveVar(0);

    if(!Session.get('project')) {
      Session.set('project', Projects.findOne({})._id);
    }

    this.timerHandle = Meteor.setInterval(() => {
      timerDependency.changed();
    }, 1000);
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

    $('#datetime').datetimepicker({
      locale: 'de',
      defaultDate: new Date(),
      sideBySide: true,
    });
  };

  Template.addTask.events({
    'click #start-timer': function() {
      Session.set('started', true);
      Session.set('startTime', new Date());
      $('#datetime').data("DateTimePicker").minDate(Session.get('startTime'));
      return false;
    },
    'click #start-timer-at': function() {
      Session.set('started', true);
      Session.set('startTime', $('#datetime').data("DateTimePicker").date().toDate());
      $('#datetime').data("DateTimePicker").minDate(Session.get('startTime'));
      return false;
    },
    'click #stop-timer': function() {
      Session.set('started', false);
      $('#datetime').data("DateTimePicker").minDate(false);
      Tasks.insert({
        description: $('#description').val(),
        startTime: Session.get('startTime'),
        stopTime: new Date(),
        project: $('#select-project').val(),
        createdAt: new Date()
      });
      return false;
    },
    'click #stop-timer-at': function() {
      Session.set('started', false);
      $('#datetime').data("DateTimePicker").minDate(false);
      Tasks.insert({
        description: $('#description').val(),
        startTime: Session.get('startTime'),
        stopTime: $('#datetime').data("DateTimePicker").date().toDate(),
        project: $('#select-project').val(),
        createdAt: new Date()
      });
      return false;
    }
  });
}