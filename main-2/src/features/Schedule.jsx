import Layout from '../components/Layout';
import ScheduleHeader from '../components/ScheduleHeader';
import './Schedule.css';

function Schedule() {
  return (
    <Layout
      noScroll={true}
      featureHeader={<ScheduleHeader />}
    >
      <div className="schedule-container">
        <iframe
          src="/schedule.html"
          className="schedule-iframe"
          title="Race Schedule"
        />
      </div>
    </Layout>
  );
}

export default Schedule;
