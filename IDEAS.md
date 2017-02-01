# Features under Consideration

## Shared Fields

If we want to share state over multiple instances, we currently need this to do so:

```tsx
class EventItemController {

  @observable private expanded: ReadonlyArray<Event> = [];

  isExpanded(event: Event): boolean {
    return this.expanded.indexOf(event) !== -1;
  }

  expand(event: Event) {
    const expanded = new Set(this.expanded);
    expanded.add(event);
    this.expanded = [...expanded];
  }

  collapse(event: Event) {
    const expanded = new Set(this.expanded);
    expanded.delete(event);
    this.expanded = [...expanded];
  }

}

@observer class EventItem extends Component<{ id: IIdentifier, event: Event }, {}> {

  @field private controller = new EventItemController();

  @computed get isExpanded(): boolean {
    return this.controller.isExpanded(this.props.event);
  }
  set isExpanded(value: boolean) {
    this.controller[value ? 'expand' : 'collapse'](this.props.event);
  }

  render() {
    const className = classNames('EventItem', { expanded: this.isExpanded });
    return <div onClick={() => this.isExpanded = true} className={className}>
      <Style>{styles}</Style>
      <p>{this.props.event.name}</p>
      {this.renderExpanded()}
    </div>;
  }

  private renderExpanded() {
    if (!this.isExpanded)
      return null;
    
    return <p>
      {this.props.event.pageUrl}<br />
      {this.props.event.venueName}
    </p>;
  }

}
```

More straight-forward and arguably more readable would be if we could do as follows:

```tsx
@observer class EventItem extends Component<{ id: IIdentifier, event: Event }, {}> {

  @observable.shared private expanded: ReadonlyArray<Event> = [];

  @computed get isExpanded(): boolean {
    return this.expanded.indexOf(this.props.event) !== -1;
  }
  set isExpanded(value: boolean) {
    const expanded = new Set(this.expanded);
    expanded[value ? 'add' : 'delete'](this.props.event);
    this.expanded = [...expanded];
  }

  render() {
    const className = classNames('EventItem', { expanded: this.isExpanded });
    return <div onClick={() => this.isExpanded = true} className={className}>
      <Style>{styles}</Style>
      <p>{this.props.event.name}</p>
      {this.renderExpanded()}
    </div>;
  }

  private renderExpanded() {
    if (!this.isExpanded)
      return null;
    
    return <p>
      {this.props.event.pageUrl}<br />
      {this.props.event.venueName}
    </p>;
  }

}
```

## Named Actions

State management would be more explicit if action types are named like in vanilla Redux:

```ts
class Controller {

  @observable private events: ReadonlyArray<Event>;
  @observable private loadCount: number = 0;

  getEvents<F>(fallback: F = null) {
    if (!this.events && this.loadCount === 0)
      reportOnError(this.load());
    
    return this.events || fallback;
  }

  @pending private async load() {
    const page = Event.transport.list();
    let instances;
    try {
      instances = await page;
    } catch (err) {
      if (isTransportError(err))
        return;
      throw err;
    }

    this.endLoad(instances);
  }

  @action private endLoad(events: ReadonlyArray<Event>) {
    this.events = events;
    this.loadCount++;
  }

}
```

Invoking `endLoad` would dispatch an action along the following lines:

```
{
  type: '@@scoopy/Controller.endLoad',
  ref: {
    '@@scoopy': 'ref',
    type: 'Controller',
    id: null
  },
  args: [
    {
      '@@scoopy': 'instance',
      type: 'Event',
      data: {
        id: 13135135,
        name: "AmsterdamJS September",
        venueName: "Publitas HQ",
        startTime: 23513058935
      }
    },
    {
      …
    }
  ]
}
```

Our dispatcher will then invoke the corresponding method implementation, side-track and quietly reduce all actions that are dispatched there and return the resulting aggregate state.


## Enable Making Pending State Explicit

The `@pending` decorator maintains state that is implicit unless we offer a means of making it explicit:

```ts
class Controller {

  @observable private events: ReadonlyArray<Event>;
  @observable loading: boolean = false;

  @pending('loading') async load() {
    const page = Event.transport.list();
    let instances;
    try {
      instances = await page;
    } catch (err) {
      if (isTransportError(err))
        return;
      throw err;
    }

    this.events = instances;
  }

}
```

Perhaps we should reserve the main decorator factory argument space for labeling, for example to allow differentiating between pending operations that should be blocking the server render and those that shouldn't:

```ts
class Controller {

  @observable private events: ReadonlyArray<Event>;
  @observable loading: boolean = false;

  @pending.set('loading') async load() {
    const page = Event.transport.list();
    let instances;
    try {
      instances = await page;
    } catch (err) {
      if (isTransportError(err))
        return;
      throw err;
    }

    this.events = instances;
  }

}
```


## Enable Making Pending State Run-Time Conditional

For a fine-tuned experience it is sometimes desirable that pending operations are *potentially* blocking, depending on application state.

Since the run-time is already in charge of deciding which pending operations are invoked to being with, this shouldn’t technically be necessary. So consider alternatives before proceeding with implementation.

```ts
class Controller {

  @observable private events: ReadonlyArray<Event>;
  @observable isSelected: boolean = false;

  @pending('isSelected') async load() {
    const page = Event.transport.list();
    let instances;
    try {
      instances = await page;
    } catch (err) {
      if (isTransportError(err))
        return;
      throw err;
    }

    this.events = instances;
  }

}
```


## Less Pitfalls When Dealing with Array Values

Several improvements can be made to make dealing with arrays more intuitive and less tricky.

### Type Restrictions on Field Definitions

It would be very useful if we could prevent fields from being declared of type `Array`, because field *values* are intrinsically immutable.

### Shim Array Mutation Methods to Dispatch Actions

The preceding improvement could be completely leapfrogged if we would provide shimmed mutation methods on arrays to make them dispatch actions to the store and thus make them safe to use.

### Transform Arrays to Array-Like Objects

By transparently transforming (via dehydrate and hydrate) array instances to pseudo-array objects, we would introduce support for custom properties on array field values.

This may be useful for working with custom collection types such as “virtual lists”.


## Support for Stateless Functional Components

We can offer an alternative means of defining a field on a view component via an higher-order component that can be wrapped around a stateless functional component:

```tsx
compose(
  getContext({
    router: PropTypes.object.isRequired
  }),
  fields(props => ({
    controller: new SearchController(props)
  })),
  observer
)(function Search({ router, controller }: { router, controller: SearchController }) {

  return <form onSubmit={onSubmitQuery}>
    <input type="search" value={controller.query} onChange={onChangeQuery}
      placeholder="Lekker zoeken kil!" />
  </form>;

  function onSubmitQuery(e) {
    e.preventDefault();
    router.replaceWith({ query: controller.query });
  }

  function onChangeQuery(e) {
    controller.query = e.currentTarget.value;
  }

});
```

## Component Factory for More Explicit Structure

We can pin down a common pattern for implementing components by offering a factory method that mitigates some of the potential for boilerplate bugs and offers more guidance around structure:

```tsx
compose(
  getContext({
    router: PropTypes.object.isRequired
  }),
  observer
)(component(Props, function Search(props: Props) {

  return <form onSubmit={onSubmitQuery}>
    <input type="search" value={props.query} onChange={onChangeQuery}
      placeholder="Lekker zoeken kil!" />
  </form>;

  function onSubmitQuery(e) {
    e.preventDefault();
    props.router.replaceWith({ query: props.query });
  }

  function onChangeQuery(e) {
    props.query = e.currentTarget.value;
  }

}));
```

Some useful attributes of this approach:

* internal type name of `Props` can be guaranteed to be unique by “namespacing” it like `Search.Props`;
* mixing regular props with controller props leaves unnecessary room for complex and confusing implementations;
* it makes the name “props” available for the class instance that holds the state;
* it enforces the render logic to be stateless and functional;
* outer props can be passed onto the `Props` instance by assigning them (`Object.assign(propsInstance, props)`), so the behavior is completely in line with native React component behavior.
