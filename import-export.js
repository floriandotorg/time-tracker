Router.route('/importexport', {
  name: 'importexport'
});

Meteor.methods({
  dropDatabase: function() {
    Projects.remove({});
    Tasks.remove({});
  }
});

if (Meteor.isClient) {
  Template.importexport.events = {
    'click #export-button': function() {
      let data = {
        projects: [],
        tasks: []
      };

      data.projects = Projects.find({}).fetch();

      Tasks.find({}).forEach(task => {
        delete task._id;
        task.project = data.projects.find(p => p._id === task.project).name;
        data.tasks.push(task);
      });

      data.projects.forEach(p => { delete p._id });

      $('#import-export-text').val(JSON.stringify(data));
    },

    'dblclick #import-button': function() {
      const data = JSON.parse($('#import-export-text').val());

      Meteor.call('dropDatabase');

      data.projects.forEach(project => {
        project._id = Projects.insert(project);
      });

      data.tasks.forEach(task => {
        task.startTime = new Date(task.startTime);
        task.stopTime = new Date(task.stopTime);
        task.createdAt = new Date(task.createdAt);

        task.project = data.projects.find(p => p.name === task.project)._id;

        Tasks.insert(task);
      });

      $('#import-export-text').val('Done!');
    }
  };
}
