import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Settings, Save } from 'lucide-react';
import DashboardWidget from './DashboardWidget';

export default function CustomizableDashboard({ 
  user, 
  dashboardType, 
  availableWidgets,
  onLayoutChange 
}) {
  const [widgets, setWidgets] = useState(availableWidgets);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadLayout();
  }, [user, dashboardType]);

  const loadLayout = async () => {
    if (!user?.id) return;
    
    try {
      const configs = await base44.entities.DashboardConfig.filter({
        user_id: user.id,
        dashboard_type: dashboardType
      });

      if (configs.length > 0) {
        const config = configs[0];
        if (config.layout_json?.widgets) {
          setWidgets(config.layout_json.widgets);
        }
      }
    } catch (error) {
      console.error('Failed to load dashboard layout:', error);
    }
  };

  const saveLayout = async () => {
    if (!user?.id) return;
    
    setIsSaving(true);
    try {
      const configs = await base44.entities.DashboardConfig.filter({
        user_id: user.id,
        dashboard_type: dashboardType
      });

      const layoutData = {
        user_id: user.id,
        org_id: user.org_id || 'default-org',
        dashboard_type: dashboardType,
        layout_json: { widgets }
      };

      if (configs.length > 0) {
        await base44.entities.DashboardConfig.update(configs[0].id, layoutData);
      } else {
        await base44.entities.DashboardConfig.create(layoutData);
      }

      setIsCustomizing(false);
    } catch (error) {
      console.error('Failed to save dashboard layout:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const reorderedWidgets = Array.from(widgets);
    const [removed] = reorderedWidgets.splice(result.source.index, 1);
    reorderedWidgets.splice(result.destination.index, 0, removed);

    setWidgets(reorderedWidgets);
    if (onLayoutChange) onLayoutChange(reorderedWidgets);
  };

  const removeWidget = (widgetId) => {
    setWidgets(widgets.filter(w => w.id !== widgetId));
  };

  return (
    <div>
      <div className="flex items-center justify-end gap-3 mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsCustomizing(!isCustomizing)}
          className="border-[rgba(255,255,255,0.08)] text-[#CED4DA]"
        >
          <Settings className="w-4 h-4 mr-2" />
          {isCustomizing ? 'Done' : 'Customize'}
        </Button>
        {isCustomizing && (
          <Button
            size="sm"
            onClick={saveLayout}
            disabled={isSaving}
            className="bg-[#E1467C] hover:bg-[#E1467C]/90 text-white"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Layout'}
          </Button>
        )}
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="dashboard">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="space-y-6"
            >
              {widgets.map((widget, index) => (
                <Draggable
                  key={widget.id}
                  draggableId={widget.id}
                  index={index}
                  isDragDisabled={!isCustomizing}
                >
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                    >
                      <DashboardWidget
                        id={widget.id}
                        title={widget.title}
                        onRemove={isCustomizing ? removeWidget : null}
                        isDragging={snapshot.isDragging}
                      >
                        {widget.component}
                      </DashboardWidget>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}