Projects = new Mongo.Collection("projects");
Projects.attachSchema(new SimpleSchema({
  name: {
    type: String,
    label: "Name",
    max: 200,
    optional: true
  },
  hourlyRate: {
    type: Number,
    label: "Hourly Rate (EUR)",
    min: 0,
    autoform: {
      defaultValue: 65
    }
  },
  hoursPerDay: {
    type: Number,
    label: "Hours per Day",
    min: 0,
    optional: true
  }
}));

Router.route('/projects', {name: 'projects'});
Router.route('/project/:_id', {
  name: 'project',
  data: function() {
    return Projects.findOne({_id: this.params._id});
  }
});

if (Meteor.isClient) {
  AutoForm.hooks({
    updateProjectForm: {
      onSuccess: function() {
        Router.go('/projects');
      }
    }
  });

  Template.projects.helpers({
    projects: function() {
      return Projects.find({});
    }
  });

  Template.project.helpers({
    goBack() {
      return () => {
        Router.go('/projects');
      }
    }
  });

  Template.projects.events = {
    'click #add-project-button': function() {
      const project = Projects.insert({});
      Router.go(`/project/${project}`);

    }
  };
}

