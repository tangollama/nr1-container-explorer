import React from 'React'
import {Grid, GridItem, Spinner} from 'nr1' 
import _ from 'underscore'

import getCardinality from '../../lib/get-cardinality'

import DenseContainerView from './dense-container-view'
import FacetTable from './facet-table'
import ContainerPanel from './container-panel'

const OMIT_KEYS = {
  systemMemoryBytes: true,
  apmApplicationIds: true,
  containerId: true,
  commandLine: true,
  commandName: true,  
  processId: true
}

function GroupList({ groups, group, selectGroup, showNone }) {  
  return <ul className="facet-list">
    {showNone && <li className='facet' key="__none" onClick={() => selectGroup(null)}>
      None
    </li>}    
    {groups.map(g => {
      const className = `facet ${g.name == group && 'selected'}`
      return <li className={className} key={g.name} onClick={() => selectGroup(g.name)}>
        {g.name} ({g.count})
      </li>
    })}
  </ul>
}



export default class ContainerExplorer extends React.Component {
  constructor(props) {
    super(props)

    this.selectContainer = this.selectContainer.bind(this)
  }

  async componentDidMount() {
    await this.reload()    
  }

  componentWillMount() {
    if(this.interval) clearInterval(this.interval)
  }

  async componentDidUpdate({where, account}) {
    if(where != this.props.where || account != this.props.account) {
      await this.reload()
    }
  }

  async reload() {
    clearInterval(this.interval)
    this.interval = null

    const startTime = new Date()
    function logTime(message) {
      const elapsed = new Date() - startTime
      // console.log("Reload", message, elapsed)
    }
    logTime("Start Reload")

    this.setState({groups: null})
    const {where, account, counts} = this.props
    const timeWindow = "SINCE 3 minutes ago"

    const facets = await getCardinality({
      eventType: 'ProcessSample',
      accountId: account.id,
      where,
      timeWindow
    })
    logTime("getCardinality")

    const groups = facets.filter(facet => {
      return facet.count > 1 && facet.count < counts.containers * .6 && !OMIT_KEYS[facet.name]      
    })

    this.setState({groups: _.sortBy(groups, 'name')})
  }

  selectContainer(containerId) {
    this.setState({containerId})
  }

  render() {
    const {addFilter, counts} = this.props
    const {groups, group, containerId} = this.state || {}
    const tooMany = counts.containers > 2000

    if(!groups) return <Spinner fillContainer/>

    return <div className='content'>
      <Grid>
        <GridItem columnSpan={3}>
          <GroupList groups={groups} group={group} showNone={!tooMany}
            selectGroup={(group)=> this.setState({group})}/>
        </GridItem>
        <GridItem columnSpan={9}>
          {!tooMany && <DenseContainerView {...this.props} {...this.state} 
            selectContainer={this.selectContainer}/>}
          {tooMany && group && <FacetTable {...this.props} {...this.state}
            setFacetValue={(value) => addFilter(group, value)}/>}
        </GridItem>
      </Grid>
    </div>
  }

}