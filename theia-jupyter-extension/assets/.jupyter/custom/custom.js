require(["base/js/namespace"], function (Jupyter) {
  Jupyter._target = '_self';
});

/*
require(["tree/js/notebooklist"], (x) => {
  const previous = x.NotebookList.prototype.add_link;
  const NotebookList = x.NotebookList;
  NotebookList.prototype.add_link = function(model, item) {
    const that = this;
    previous.call(that, model, item);

    var link = item.find("a.item_link");
    link.click(() => {
      // modify link here
      return false;
    });
  };
});
*/
