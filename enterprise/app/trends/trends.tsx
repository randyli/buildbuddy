import React from "react";
import moment from "moment";
import * as format from "../../../app/format/format";
import rpcService from "../../../app/service/rpc_service";
import { User } from "../../../app/auth/auth_service";
import { stats } from "../../../proto/stats_ts_proto";
import TrendsChartComponent from "./trends_chart";
import CacheChartComponent from "./cache_chart";
import PercentilesChartComponent from "./percentile_chart";
import { Subscription } from "rxjs";
import CheckboxButton from "../../../app/components/button/checkbox_button";
import FilterComponent from "../filter/filter";
import capabilities from "../../../app/capabilities/capabilities";
import { getProtoFilterParams } from "../filter/filter_util";
import router from "../../../app/router/router";
import * as proto from "../../../app/util/proto";
import DrilldownPageComponent from "./drilldown_page";

const BITS_PER_BYTE = 8;

interface Props {
  user: User;
  hash: string;
  search: URLSearchParams;
}

interface State {
  stats: stats.ITrendStat[];
  loading: boolean;
  dateToStatMap: Map<string, stats.ITrendStat>;
  dateToExecutionStatMap: Map<string, stats.IExecutionStat>;
  enableInvocationPercentileCharts: boolean;
  dates: string[];
}

const SECONDS_PER_MICROSECOND = 1e-6;

export default class TrendsComponent extends React.Component<Props, State> {
  state: State = {
    stats: [],
    loading: true,
    dateToStatMap: new Map<string, stats.ITrendStat>(),
    dateToExecutionStatMap: new Map<string, stats.IExecutionStat>(),
    enableInvocationPercentileCharts: false,
    dates: [],
  };

  subscription?: Subscription;

  componentWillMount() {
    document.title = `Trends | BuildBuddy`;
    this.fetchStats();

    this.subscription = rpcService.events.subscribe({
      next: (name) => name == "refresh" && this.fetchStats(),
    });
  }

  componentWillUnmount() {
    this.subscription?.unsubscribe();
  }

  componentDidUpdate(prevProps: Props) {
    if (this.props.hash !== prevProps.hash || this.props.search != prevProps.search) {
      this.fetchStats();
    }
  }

  updateSelectedTab(tab: "charts" | "drilldown") {
    window.location.hash = "#" + tab;
  }

  getSelectedTab(): "charts" | "drilldown" {
    if (this.props.hash.replace("#", "") === "drilldown") {
      return "drilldown";
    }
    return "charts";
  }

  fetchStats() {
    // TODO(bduffany): Cancel in-progress request

    let request = new stats.GetTrendRequest();
    request.query = new stats.TrendQuery();

    const filterParams = getProtoFilterParams(this.props.search);
    if (filterParams.role) {
      request.query.role = filterParams.role;
    } else {
      // Note: Technically we're filtering out workflows and unknown roles,
      // even though the user has selected "All roles". But we do this to
      // avoid double-counting build times for workflows and their nested CI runs.
      request.query.role = ["", "CI"];
    }

    if (filterParams.host) request.query.host = filterParams.host;
    if (filterParams.user) request.query.user = filterParams.user;
    if (filterParams.repo) request.query.repoUrl = filterParams.repo;
    if (filterParams.branch) request.query.branchName = filterParams.branch;
    if (filterParams.commit) request.query.commitSha = filterParams.commit;
    if (filterParams.command) request.query.command = filterParams.command;
    if (filterParams.pattern) request.query.pattern = filterParams.pattern;
    if (filterParams.status) request.query.status = filterParams.status;

    request.query.updatedBefore = filterParams.updatedBefore;
    request.query.updatedAfter = filterParams.updatedAfter;

    const user = this.props.search.get("user");
    if (user) {
      request.query.user = user;
    }

    const host = this.props.search.get("host");
    if (host) {
      request.query.host = host;
    }

    const commit = this.props.search.get("commit");
    if (commit) {
      request.query.commitSha = commit;
    }

    const branch = this.props.search.get("branch");
    if (branch) {
      request.query.branchName = branch;
    }

    const repo = this.props.search.get("repo");
    if (repo) {
      request.query.repoUrl = repo;
    }

    const command = this.props.search.get("command");
    if (command) {
      request.query.command = command;
    }

    const pattern = capabilities.config.patternFilterEnabled && this.props.search.get("pattern");
    if (pattern) {
      request.query.pattern = pattern;
    }

    this.setState({ ...this.state, loading: true });
    rpcService.service.getTrend(request).then((response) => {
      console.log(response);
      const dateToStatMap = new Map<string, stats.ITrendStat>();
      for (let stat of response.trendStat) {
        dateToStatMap.set(stat.name ?? "", stat);
      }
      const dateToExecutionStatMap = new Map<string, stats.IExecutionStat>();
      for (let stat of response.executionStat) {
        dateToExecutionStatMap.set(stat.name ?? "", stat);
      }
      this.setState({
        ...this.state,
        stats: response.trendStat,
        dates: getDatesBetween(
          // Start date should always be defined.
          proto.timestampToDate(request.query!.updatedAfter || {}),
          // End date may not be defined -- default to today.
          request.query!.updatedBefore ? proto.timestampToDate(request.query!.updatedBefore) : new Date()
        ),
        dateToStatMap,
        dateToExecutionStatMap,
        enableInvocationPercentileCharts: response.hasInvocationStatPercentiles,
        loading: false,
      });
    });
  }

  getStat(date: string): stats.ITrendStat {
    return this.state.dateToStatMap.get(date) || {};
  }

  getExecutionStat(date: string): stats.IExecutionStat {
    return this.state.dateToExecutionStatMap.get(date) || {};
  }

  formatLongDate(date: any) {
    return moment(date).format("dddd, MMMM Do YYYY");
  }

  formatShortDate(date: any) {
    return moment(date).format("MMM D");
  }

  onBarClicked(hash: string, sortBy: string, date: string) {
    router.navigateTo("/?start=" + date + "&end=" + date + "&sort-by=" + sortBy + hash);
  }

  showingDrilldown(): boolean {
    return (capabilities.config.trendsHeatmapEnabled || false) && this.props.hash === "#drilldown";
  }

  render() {
    return (
      <div className="trends">
        <div className="container">
          <div className="trends-header">
            <div className="trends-title">Trends</div>
            <FilterComponent search={this.props.search} />
          </div>
          {capabilities.config.trendsHeatmapEnabled && (
            <div className="tabs">
              <div
                onClick={() => this.updateSelectedTab("charts")}
                className={`tab ${this.getSelectedTab() == "charts" ? "selected" : ""}`}>
                Charts
              </div>
              <div
                onClick={() => this.updateSelectedTab("drilldown")}
                className={`tab ${this.getSelectedTab() == "drilldown" ? "selected" : ""}`}>
                Drilldown
              </div>
            </div>
          )}
          {this.showingDrilldown() && (
            <DrilldownPageComponent user={this.props.user} search={this.props.search}></DrilldownPageComponent>
          )}
          {!this.showingDrilldown() && this.state.loading && <div className="loading"></div>}
          {!this.showingDrilldown() && !this.state.loading && (
            <>
              <TrendsChartComponent
                title="Builds"
                data={this.state.dates}
                extractValue={(date) => +(this.getStat(date).totalNumBuilds ?? 0)}
                extractSecondaryValue={(date) => {
                  let stat = this.getStat(date);
                  return (
                    (+(stat.totalBuildTimeUsec ?? 0) * SECONDS_PER_MICROSECOND) / +(stat.completedInvocationCount ?? 0)
                  );
                }}
                extractLabel={this.formatShortDate}
                formatTickValue={format.count}
                allowDecimals={false}
                formatHoverLabel={this.formatLongDate}
                formatHoverValue={(value) => (value || 0) + " builds"}
                formatSecondaryHoverValue={(value) => `${format.durationSec(value)} average`}
                formatSecondaryTickValue={format.durationSec}
                name="builds"
                secondaryName="average build duration"
                secondaryLine={true}
                separateAxis={true}
                onBarClicked={this.onBarClicked.bind(this, "", "")}
              />
              {this.state.enableInvocationPercentileCharts && (
                <PercentilesChartComponent
                  title="Build duration"
                  data={this.state.dates}
                  extractLabel={this.formatShortDate}
                  formatHoverLabel={this.formatLongDate}
                  extractP50={(date) => +(this.getStat(date).buildTimeUsecP50 ?? 0) * SECONDS_PER_MICROSECOND}
                  extractP75={(date) => +(this.getStat(date).buildTimeUsecP75 ?? 0) * SECONDS_PER_MICROSECOND}
                  extractP90={(date) => +(this.getStat(date).buildTimeUsecP90 ?? 0) * SECONDS_PER_MICROSECOND}
                  extractP95={(date) => +(this.getStat(date).buildTimeUsecP95 ?? 0) * SECONDS_PER_MICROSECOND}
                  extractP99={(date) => +(this.getStat(date).buildTimeUsecP99 ?? 0) * SECONDS_PER_MICROSECOND}
                  onColumnClicked={this.onBarClicked.bind(this, "", "duration")}
                />
              )}
              {!this.state.enableInvocationPercentileCharts && (
                <TrendsChartComponent
                  title="Build duration"
                  data={this.state.dates}
                  extractValue={(date) => {
                    let stat = this.getStat(date);
                    return +(stat.totalBuildTimeUsec ?? 0) / +(stat.completedInvocationCount ?? 0) / 1000000;
                  }}
                  extractSecondaryValue={(date) => +(this.getStat(date).maxDurationUsec ?? 0) / 1000000}
                  extractLabel={this.formatShortDate}
                  formatTickValue={format.durationSec}
                  formatHoverLabel={this.formatLongDate}
                  formatHoverValue={(value) => `${format.durationSec(value || 0)} average`}
                  formatSecondaryHoverValue={(value) => `${format.durationSec(value || 0)} slowest`}
                  name="average build duration"
                  secondaryName="slowest build duration"
                  onBarClicked={this.onBarClicked.bind(this, "", "")}
                  onSecondaryBarClicked={this.onBarClicked.bind(this, "", "duration")}
                />
              )}

              <CacheChartComponent
                title="Action Cache"
                data={this.state.dates}
                extractLabel={this.formatShortDate}
                formatHoverLabel={this.formatLongDate}
                extractHits={(date) => +(this.getStat(date).actionCacheHits ?? 0)}
                secondaryBarName="misses"
                extractSecondary={(date) => +(this.getStat(date).actionCacheMisses ?? 0)}
              />
              <CacheChartComponent
                title="Content Addressable Store"
                data={this.state.dates}
                extractLabel={this.formatShortDate}
                formatHoverLabel={this.formatLongDate}
                extractHits={(date) => +(this.getStat(date).casCacheHits ?? 0)}
                secondaryBarName="writes"
                extractSecondary={(date) => +(this.getStat(date).casCacheUploads ?? 0)}
              />

              <TrendsChartComponent
                title="Cache read throughput"
                data={this.state.dates}
                extractValue={(date) => +(this.getStat(date).totalDownloadSizeBytes ?? 0)}
                extractSecondaryValue={(date) =>
                  (+(this.getStat(date).totalDownloadSizeBytes ?? 0) * BITS_PER_BYTE) /
                  (+(this.getStat(date).totalDownloadUsec ?? 0) * SECONDS_PER_MICROSECOND)
                }
                extractLabel={this.formatShortDate}
                formatTickValue={format.bytes}
                allowDecimals={false}
                formatSecondaryTickValue={format.bitsPerSecond}
                formatHoverLabel={this.formatLongDate}
                formatHoverValue={(value) => `${format.bytes(value || 0)} downloaded`}
                formatSecondaryHoverValue={(value) => format.bitsPerSecond(value || 0)}
                name="total download size"
                secondaryName="download rate"
                secondaryLine={true}
                separateAxis={true}
              />

              <TrendsChartComponent
                title="Cache write throughput"
                data={this.state.dates}
                extractValue={(date) => +(this.getStat(date).totalUploadSizeBytes ?? 0)}
                extractSecondaryValue={(date) =>
                  (+(this.getStat(date).totalUploadSizeBytes ?? 0) * BITS_PER_BYTE) /
                  (+(this.getStat(date).totalUploadUsec ?? 0) * SECONDS_PER_MICROSECOND)
                }
                extractLabel={this.formatShortDate}
                formatTickValue={format.bytes}
                formatSecondaryTickValue={format.bitsPerSecond}
                formatHoverLabel={this.formatLongDate}
                formatHoverValue={(value) => `${format.bytes(value || 0)} uploaded`}
                formatSecondaryHoverValue={(value) => format.bitsPerSecond(value || 0)}
                name="total upload size"
                secondaryName="upload rate"
                secondaryLine={true}
                separateAxis={true}
              />

              <TrendsChartComponent
                title="Users with builds"
                data={this.state.dates}
                extractValue={(date) => +(this.getStat(date).userCount ?? 0)}
                extractLabel={this.formatShortDate}
                formatTickValue={format.count}
                allowDecimals={false}
                formatHoverLabel={this.formatLongDate}
                formatHoverValue={(value) => (value || 0) + " users"}
                name="users with builds"
                onBarClicked={this.onBarClicked.bind(this, "#users", "")}
              />
              <TrendsChartComponent
                title="Commits with builds"
                data={this.state.dates}
                extractValue={(date) => +(this.getStat(date).commitCount ?? 0)}
                extractLabel={this.formatShortDate}
                formatTickValue={format.count}
                allowDecimals={false}
                formatHoverLabel={this.formatLongDate}
                formatHoverValue={(value) => (value || 0) + " commits"}
                name="commits with builds"
                onBarClicked={this.onBarClicked.bind(this, "#commits", "")}
              />
              <TrendsChartComponent
                title="Branches with builds"
                data={this.state.dates}
                extractValue={(date) => +(this.getStat(date).branchCount ?? 0)}
                extractLabel={this.formatShortDate}
                formatTickValue={format.count}
                allowDecimals={false}
                formatHoverLabel={this.formatLongDate}
                formatHoverValue={(value) => (value || 0) + " branches"}
                name="branches with builds"
              />
              <TrendsChartComponent
                title="Hosts with builds"
                data={this.state.dates}
                extractValue={(date) => +(this.getStat(date).hostCount ?? 0)}
                extractLabel={this.formatShortDate}
                formatTickValue={format.count}
                allowDecimals={false}
                formatHoverLabel={this.formatLongDate}
                formatHoverValue={(value) => (value || 0) + " hosts"}
                name="hosts with builds"
                onBarClicked={this.onBarClicked.bind(this, "#hosts", "")}
              />
              <TrendsChartComponent
                title="Repos with builds"
                data={this.state.dates}
                extractValue={(date) => +(this.getStat(date).repoCount ?? 0)}
                extractLabel={this.formatShortDate}
                formatTickValue={format.count}
                allowDecimals={false}
                formatHoverLabel={this.formatLongDate}
                formatHoverValue={(value) => (value || 0) + " repos"}
                name="repos with builds"
                onBarClicked={this.onBarClicked.bind(this, "#repos", "")}
              />
              {this.state.dateToExecutionStatMap.size > 0 && (
                <PercentilesChartComponent
                  title="Remote Execution Queue Duration"
                  data={this.state.dates}
                  extractLabel={this.formatShortDate}
                  formatHoverLabel={this.formatLongDate}
                  extractP50={(date) =>
                    +(this.getExecutionStat(date).queueDurationUsecP50 ?? 0) * SECONDS_PER_MICROSECOND
                  }
                  extractP75={(date) =>
                    +(this.getExecutionStat(date).queueDurationUsecP75 ?? 0) * SECONDS_PER_MICROSECOND
                  }
                  extractP90={(date) =>
                    +(this.getExecutionStat(date).queueDurationUsecP90 ?? 0) * SECONDS_PER_MICROSECOND
                  }
                  extractP95={(date) =>
                    +(this.getExecutionStat(date).queueDurationUsecP95 ?? 0) * SECONDS_PER_MICROSECOND
                  }
                  extractP99={(date) =>
                    +(this.getExecutionStat(date).queueDurationUsecP99 ?? 0) * SECONDS_PER_MICROSECOND
                  }
                />
              )}
            </>
          )}
        </div>
      </div>
    );
  }
}

function getDatesBetween(start: Date, end: Date): string[] {
  const endMoment = moment(end);
  const formattedDates: string[] = [];
  for (let date = moment(start); date.isBefore(endMoment); date = date.add(1, "days")) {
    formattedDates.push(date.format("YYYY-MM-DD"));
  }
  return formattedDates;
}
