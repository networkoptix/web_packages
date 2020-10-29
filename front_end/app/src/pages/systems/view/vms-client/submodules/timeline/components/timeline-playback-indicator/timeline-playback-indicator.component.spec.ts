import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import TimelinePlaybackIndicatorComponent from './timeline-playback-indicator.component';

describe('TimelinePlaybackIndicatorComponent', () => {
  let component: TimelinePlaybackIndicatorComponent;
  let fixture: ComponentFixture<TimelinePlaybackIndicatorComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ TimelinePlaybackIndicatorComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TimelinePlaybackIndicatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
