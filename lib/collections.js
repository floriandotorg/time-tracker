Projects = new Mongo.Collection("projects");
Projects.attachSchema(new SimpleSchema({
  name: {
    type: String,
    label: "Name",
    max: 200,
  },
  hourlyRate: {
    type: Number,
    label: "Hourly Rate (EUR)",
    min: 0
  },
  hoursPerDay: {
    type: Number,
    label: "Hours per Day",
    min: 0,
    optional: true
  }
}));

Tasks = new Mongo.Collection("tasks");
