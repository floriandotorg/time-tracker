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
      const project = Projects.insert({
        name: 'Project',
        hourlyRate: 65
      });
      Router.go(`/project/${project}`);

    }
  };
}

